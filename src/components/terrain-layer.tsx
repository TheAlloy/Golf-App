import { geoOrthographic } from 'd3-geo';
import { Asset } from 'expo-asset';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import {
  ATLAS_TILES,
  wantedCells,
  covers,
  IMAGERY,
  IMAGERY_ENABLED,
  LonLatBounds,
  planAtlas,
  TileRect,
  tileUrl,
} from '@/lib/imagery';
import { loadTile, TilePixels } from '@/lib/tile-loader';

/**
 * NASA Blue Marble (public domain), 4096×2048 equirectangular. Bundled so the
 * terrain view works offline and never depends on a tile server. Streamed
 * tiles sharpen it once you zoom in.
 */
const BLUE_MARBLE = require('../../assets/earth/blue-marble.jpg');

type Props = {
  width: number;
  height: number;
  /** Globe centre and radius in layout pixels. */
  cx: number;
  cy: number;
  radius: number;
  /** d3-geo rotation, degrees. */
  rotation: [number, number];
};

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Inverse orthographic projection per fragment: pixel → point on the unit
// sphere → longitude/latitude → texel. The maths mirrors d3-geo's
// rotate([λ, φ]), which puts (−λ, −φ) at the centre of the disc. Imagery comes
// from the tile atlas where a loaded tile covers the point, otherwise from the
// bundled whole-earth texture.
const FRAG = `
precision highp float;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_height;
uniform vec2 u_centreGeo;
uniform sampler2D u_tex;
uniform sampler2D u_atlas;
uniform sampler2D u_mask;
// Atlas window: tile x0, tile y0, tiles across the world at this zoom, tiles across the atlas.
uniform vec4 u_rect;
uniform float u_useTiles;
const float PI = 3.141592653589793;
const float MERCATOR_LIMIT = 1.4844222297;

void main() {
  vec2 p = vec2(gl_FragCoord.x, u_height - gl_FragCoord.y);
  float x = (p.x - u_center.x) / u_radius;
  float y = (u_center.y - p.y) / u_radius;
  float rho = sqrt(x * x + y * y);
  // One-pixel feather at the limb so the disc edge is anti-aliased.
  float alpha = clamp((1.0 - rho) * u_radius + 0.5, 0.0, 1.0);
  if (alpha <= 0.0) discard;
  if (rho > 1.0) { x /= rho; y /= rho; rho = 1.0; }
  float z = sqrt(max(0.0, 1.0 - rho * rho));

  float lambda0 = u_centreGeo.x;
  float phi0 = u_centreGeo.y;
  float sinPhi0 = sin(phi0);
  float cosPhi0 = cos(phi0);
  float lat = asin(clamp(z * sinPhi0 + y * cosPhi0, -1.0, 1.0));
  float lon = lambda0 + atan(x, z * cosPhi0 - y * sinPhi0);
  float u = fract((lon + PI) / (2.0 * PI));

  vec3 color = texture2D(u_tex, vec2(u, (PI * 0.5 - lat) / PI)).rgb;

  if (u_useTiles > 0.5 && abs(lat) < MERCATOR_LIMIT) {
    float n = u_rect.z;
    float tx = u * n;
    float ty = (1.0 - log(tan(lat) + 1.0 / cos(lat)) / PI) * 0.5 * n;
    vec2 a = vec2(tx - u_rect.x, ty - u_rect.y) / u_rect.w;
    if (a.x >= 0.0 && a.x < 1.0 && a.y >= 0.0 && a.y < 1.0) {
      if (texture2D(u_mask, a).r > 0.5) color = texture2D(u_atlas, a).rgb;
    }
  }

  // Sun from the upper left, a darker limb, and a thin blue haze right at the
  // edge, which is what makes a flat texture read as a planet.
  vec3 normal = vec3(x, y, z);
  vec3 light = normalize(vec3(-0.45, 0.55, 0.7));
  float diffuse = clamp(dot(normal, light), 0.0, 1.0);
  float shade = 0.58 + 0.42 * diffuse;
  float rim = pow(1.0 - z, 3.0);
  color = mix(color * shade, vec3(0.55, 0.75, 0.95), rim * 0.45);

  gl_FragColor = vec4(color * alpha, alpha);
}
`;

type Scene = {
  gl: ExpoWebGLRenderingContext;
  program: WebGLProgram;
  atlas: WebGLTexture;
  mask: WebGLTexture;
  uCenter: WebGLUniformLocation | null;
  uRadius: WebGLUniformLocation | null;
  uHeight: WebGLUniformLocation | null;
  uCentreGeo: WebGLUniformLocation | null;
  uRect: WebGLUniformLocation | null;
  uUseTiles: WebGLUniformLocation | null;
};

/** Which tiles the atlas currently holds, and which cells have landed. */
type AtlasState = {
  rect: TileRect;
  /** Bumped on every refill so stale downloads are dropped on arrival. */
  generation: number;
  loaded: boolean[];
  /** Cells already queued or in flight, so a view update never double-requests. */
  queued: Set<number>;
};

/** How long a zoom level has to hold before tiles for it are fetched. */
const LEVEL_SETTLE_MS = 150;

const MAX_PARALLEL = 6;
const CACHE_LIMIT = 192;

/** Decoded tiles by URL, most recently used last. */
const tileCache = new Map<string, TilePixels>();
const failed = new Set<string>();

function cacheGet(url: string): TilePixels | undefined {
  const hit = tileCache.get(url);
  if (hit) {
    tileCache.delete(url);
    tileCache.set(url, hit);
  }
  return hit;
}

function cachePut(url: string, tile: TilePixels) {
  tileCache.set(url, tile);
  if (tileCache.size > CACHE_LIMIT) {
    const oldest = tileCache.keys().next().value;
    if (oldest !== undefined) tileCache.delete(oldest);
  }
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader failed to compile: ${log}`);
  }
  return shader;
}

/** Resolve the bundled texture into something texImage2D accepts on this platform. */
async function loadBaseTexture(): Promise<Asset | HTMLImageElement> {
  const asset = Asset.fromModule(BLUE_MARBLE);
  await asset.downloadAsync();
  if (Platform.OS !== 'web') return asset;
  // The web shim wraps a URI in an Image but doesn't wait for it to load.
  const image = new Image();
  image.src = asset.localUri ?? asset.uri;
  await image.decode();
  return image;
}

/**
 * The longitude/latitude window on screen, or null when the globe's edge is
 * visible (then the whole-earth texture is sharp enough on its own).
 */
function visibleBounds(
  width: number,
  height: number,
  cx: number,
  cy: number,
  radius: number,
  rotation: [number, number]
): LonLatBounds | null {
  const projection = geoOrthographic().scale(radius).translate([cx, cy]).rotate(rotation);
  const invert = projection.invert;
  if (!invert) return null;
  let lon0 = Infinity;
  let lon1 = -Infinity;
  let lat0 = Infinity;
  let lat1 = -Infinity;
  for (const corner of [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ] as [number, number][]) {
    // Off the disc entirely? Then the limb is on screen.
    if (Math.hypot(corner[0] - cx, corner[1] - cy) >= radius) return null;
    const g = invert(corner);
    if (!g) return null;
    lon0 = Math.min(lon0, g[0]);
    lon1 = Math.max(lon1, g[0]);
    lat0 = Math.min(lat0, g[1]);
    lat1 = Math.max(lat1, g[1]);
  }
  if (lon1 - lon0 > 180) return null; // straddles the antimeridian
  return [
    [lon0, lat0],
    [lon1, lat1],
  ];
}

/**
 * Satellite imagery wrapped onto the globe. Sits under the vector layer, which
 * keeps drawing borders, pins and labels on top; the SVG leaves the disc
 * transparent while this is mounted.
 */
export default function TerrainLayer({ width, height, cx, cy, radius, rotation }: Props) {
  const scene = useRef<Scene | null>(null);
  const atlas = useRef<AtlasState | null>(null);
  const inFlight = useRef(0);
  const queue = useRef<{ i: number; j: number; generation: number }[]>([]);
  const redraw = useRef<() => void>(() => {});
  // The download loop re-enters itself when a tile lands; a ref avoids a
  // callback referring to itself.
  const pumpRef = useRef<() => void>(() => {});
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const onContextCreate = useCallback(async (gl: ExpoWebGLRenderingContext) => {
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Program failed to link: ${gl.getProgramInfoLog(program)}`);
    }
    gl.useProgram(program);

    // One full-screen triangle pair; everything happens in the fragment shader.
    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Unit 0: the whole earth. Wrap east-west so the antimeridian seam
    // disappears; mipmaps keep the zoomed-out view from shimmering.
    const base = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, base);
    const source = await loadBaseTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as never);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
    const aniso =
      gl.getExtension('EXT_texture_filter_anisotropic') ||
      gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    if (aniso) {
      const max = gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number;
      gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, max));
    }
    gl.uniform1i(gl.getUniformLocation(program, 'u_tex'), 0);

    // Unit 1: the tile atlas, an 8×8 window of the tile grid. Tiles are chosen
    // to match screen resolution, so plain linear filtering is enough.
    const atlasTex = gl.createTexture();
    if (!atlasTex) return;
    const atlasSize = ATLAS_TILES * IMAGERY.tileSize;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, atlasTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      atlasSize,
      atlasSize,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.uniform1i(gl.getUniformLocation(program, 'u_atlas'), 1);

    // Unit 2: one byte per atlas cell saying whether its tile has arrived.
    const maskTex = gl.createTexture();
    if (!maskTex) return;
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, maskTex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      ATLAS_TILES,
      ATLAS_TILES,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      new Uint8Array(ATLAS_TILES * ATLAS_TILES)
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.uniform1i(gl.getUniformLocation(program, 'u_mask'), 2);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    scene.current = {
      gl,
      program,
      atlas: atlasTex,
      mask: maskTex,
      uCenter: gl.getUniformLocation(program, 'u_center'),
      uRadius: gl.getUniformLocation(program, 'u_radius'),
      uHeight: gl.getUniformLocation(program, 'u_height'),
      uCentreGeo: gl.getUniformLocation(program, 'u_centreGeo'),
      uRect: gl.getUniformLocation(program, 'u_rect'),
      uUseTiles: gl.getUniformLocation(program, 'u_useTiles'),
    };
    setReady(true);
  }, []);

  /** Copy a decoded tile into its atlas cell and flag the cell as ready. */
  const placeTile = useCallback((i: number, j: number, tile: TilePixels) => {
    const s = scene.current;
    const a = atlas.current;
    if (!s || !a) return;
    const { gl } = s;
    const size = IMAGERY.tileSize;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, s.atlas);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      i * size,
      j * size,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      tile as never
    );
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, s.mask);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      i,
      j,
      1,
      1,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255])
    );
    a.loaded[j * ATLAS_TILES + i] = true;
  }, []);

  /** Work through the queue, a few downloads at a time. */
  const pump = useCallback(() => {
    while (inFlight.current < MAX_PARALLEL && queue.current.length > 0) {
      const job = queue.current.shift();
      const a = atlas.current;
      if (!job || !a || job.generation !== a.generation) continue;
      const x = a.rect.x0 + job.i;
      const y = a.rect.y0 + job.j;
      const url = tileUrl(a.rect.z, x, y);
      if (failed.has(url)) continue;
      const cached = cacheGet(url);
      if (cached) {
        placeTile(job.i, job.j, cached);
        continue;
      }
      inFlight.current += 1;
      loadTile(url, IMAGERY.tileSize)
        .then((tile) => {
          cachePut(url, tile);
          if (atlas.current?.generation === job.generation) {
            placeTile(job.i, job.j, tile);
            redraw.current();
          }
        })
        .catch(() => failed.add(url))
        .finally(() => {
          inFlight.current -= 1;
          pumpRef.current();
        });
    }
    redraw.current();
  }, [placeTile]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  useEffect(() => () => clearTimeout(settle.current), []);

  /** Point the atlas at a new window of tiles and start filling it. */
  /** Queue any wanted cells that are neither loaded nor already requested. */
  const ensure = useCallback(
    (cells: [number, number][]) => {
      const a = atlas.current;
      if (!a) return;
      let added = false;
      for (const [i, j] of cells) {
        const index = j * ATLAS_TILES + i;
        if (a.loaded[index] || a.queued.has(index)) continue;
        a.queued.add(index);
        queue.current.push({ i, j, generation: a.generation });
        added = true;
      }
      if (added) pump();
    },
    [pump]
  );

  const refill = useCallback(
    (rect: TileRect, cells: [number, number][]) => {
      const s = scene.current;
      if (!s) return;
      const generation = (atlas.current?.generation ?? 0) + 1;
      atlas.current = {
        rect,
        generation,
        loaded: new Array(ATLAS_TILES * ATLAS_TILES).fill(false),
        queued: new Set(),
      };
      const { gl } = s;
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, s.mask);
      gl.texSubImage2D(
        gl.TEXTURE_2D,
        0,
        0,
        0,
        ATLAS_TILES,
        ATLAS_TILES,
        gl.LUMINANCE,
        gl.UNSIGNED_BYTE,
        new Uint8Array(ATLAS_TILES * ATLAS_TILES)
      );
      queue.current = [];
      ensure(cells);
    },
    [ensure]
  );

  useEffect(() => {
    const s = scene.current;
    if (!s || !ready) return;
    const { gl } = s;
    const bw = gl.drawingBufferWidth;
    const bh = gl.drawingBufferHeight;
    if (!bw || !bh) return;
    // Layout pixels → buffer pixels (device pixel ratio).
    const k = bw / width;

    // Decide which tiles this view wants, and refill the atlas if it has moved
    // on from what's loaded.
    let useTiles = false;
    if (IMAGERY_ENABLED) {
      const bounds = visibleBounds(width, height, cx, cy, radius, rotation);
      const plan = bounds ? planAtlas(bounds, radius * k, IMAGERY) : null;
      if (plan) {
        useTiles = true;
        const current = atlas.current;
        const cells = wantedCells(plan.rect, plan.needed);
        if (!current) {
          refill(plan.rect, cells);
        } else if (current.rect.z !== plan.rect.z) {
          // Mid-pinch the level changes every frame; wait for it to settle so
          // only the level you land on is fetched.
          clearTimeout(settle.current);
          settle.current = setTimeout(() => refill(plan.rect, cells), LEVEL_SETTLE_MS);
        } else if (!covers(current.rect, plan.needed)) {
          refill(plan.rect, cells);
        } else {
          ensure(cells);
        }
      }
    }

    const draw = () => {
      const a = atlas.current;
      gl.viewport(0, 0, bw, bh);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(s.program);
      gl.uniform2f(s.uCenter, cx * k, cy * k);
      gl.uniform1f(s.uRadius, radius * k);
      gl.uniform1f(s.uHeight, bh);
      const toRad = Math.PI / 180;
      gl.uniform2f(s.uCentreGeo, -rotation[0] * toRad, -rotation[1] * toRad);
      gl.uniform1f(s.uUseTiles, useTiles && a ? 1 : 0);
      if (a) gl.uniform4f(s.uRect, a.rect.x0, a.rect.y0, 2 ** a.rect.z, ATLAS_TILES);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.endFrameEXP();
    };
    redraw.current = draw;
    draw();
  }, [ready, width, height, cx, cy, radius, rotation, refill, ensure]);

  return (
    <GLView
      style={[StyleSheet.absoluteFill, { width, height }]}
      pointerEvents="none"
      onContextCreate={onContextCreate}
    />
  );
}
