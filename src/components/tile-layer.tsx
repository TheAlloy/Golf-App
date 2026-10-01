import { geoOrthographic } from 'd3-geo';
import { Asset } from 'expo-asset';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

import {
  ATLAS_TILES,
  covers,
  isEnabled,
  LonLatBounds,
  lonLatToTile,
  planAtlas,
  TileRect,
  TileSource,
  tileUrl,
  wantedCells,
} from '@/lib/imagery';
import { loadTile, TilePixels } from '@/lib/tile-loader';

/**
 * NASA Blue Marble (public domain), 4096×2048 equirectangular. The terrain
 * view's whole-earth fallback, so it works offline and never depends on a tile
 * server. Streamed tiles sharpen it once you zoom in.
 */
const BLUE_MARBLE = require('../../assets/earth/blue-marble.jpg');

export type TileLayerProps = {
  width: number;
  height: number;
  /** Globe centre and radius in layout pixels. */
  cx: number;
  cy: number;
  radius: number;
  /** d3-geo rotation, degrees. */
  rotation: [number, number];
  /** Which tiles to stream. */
  source: TileSource;
  /**
   * What shows where no tile has landed: the bundled whole-earth photo, or a
   * flat colour (for a dark street map, where the vector globe takes over
   * anyway once you zoom out).
   */
  fallback: { kind: 'earth' } | { kind: 'flat'; color: [number, number, number] };
  /** Sun shading and a blue limb haze, for the photographic look. */
  shaded: boolean;
  /** Told whenever the streamed tiles change state, for the attribution chip. */
  onStatus?: (status: ImageryStatus) => void;
};

/**
 * What the streamed tiles are doing: `idle` while the fallback is sharp enough
 * on its own (globe edge on screen), `loading` once tiles are wanted, `live`
 * after the first one lands, `unavailable` when they keep failing (offline, or
 * a page that blocks the tile host).
 */
export type ImageryStatus = 'idle' | 'loading' | 'live' | 'unavailable';

/** Consecutive failures before tiles are called unavailable. */
const FAILURES_BEFORE_GIVING_UP = 4;

/**
 * Past this globe radius (device pixels) the shader stops doing spherical
 * trigonometry per pixel, which runs out of float precision, and maps pixels
 * to tiles linearly around the view centre instead. At that scale the visible
 * patch is a few kilometres across, where the sphere is flat to well under a
 * pixel (checked against the exact projection: <1 tile px from here up).
 */
const LINEAR_FROM_RADIUS = 500_000;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

// Inverse orthographic projection per fragment: pixel → point on the unit
// sphere → longitude/latitude → texel. The maths mirrors d3-geo's
// rotate([λ, φ]), which puts (−λ, −φ) at the centre of the disc. Colour comes
// from the tile atlas where a loaded tile covers the point, otherwise from the
// fallback (whole-earth texture or flat colour).
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
uniform float u_useEarth;
uniform vec3 u_flat;
uniform float u_shaded;
// Deep zoom: tile coords of the view centre relative to the atlas origin, and
// tiles per unit of screen x / y (unit = globe radius).
uniform float u_linear;
uniform vec2 u_centreTile;
uniform vec2 u_tilesPerUnit;
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

  vec3 color = u_flat;
  bool tiled = false;

  if (u_linear > 0.5) {
    if (u_useTiles > 0.5) {
      vec2 a = (u_centreTile + vec2(x, y) * u_tilesPerUnit) / u_rect.w;
      if (a.x >= 0.0 && a.x < 1.0 && a.y >= 0.0 && a.y < 1.0 && texture2D(u_mask, a).r > 0.5) {
        color = texture2D(u_atlas, a).rgb;
        tiled = true;
      }
    }
  } else {
    float lambda0 = u_centreGeo.x;
    float phi0 = u_centreGeo.y;
    float sinPhi0 = sin(phi0);
    float cosPhi0 = cos(phi0);
    float lat = asin(clamp(z * sinPhi0 + y * cosPhi0, -1.0, 1.0));
    float lon = lambda0 + atan(x, z * cosPhi0 - y * sinPhi0);
    float u = fract((lon + PI) / (2.0 * PI));

    if (u_useEarth > 0.5) color = texture2D(u_tex, vec2(u, (PI * 0.5 - lat) / PI)).rgb;

    if (u_useTiles > 0.5 && abs(lat) < MERCATOR_LIMIT) {
      float n = u_rect.z;
      float tx = u * n;
      float ty = (1.0 - log(tan(lat) + 1.0 / cos(lat)) / PI) * 0.5 * n;
      vec2 a = vec2(tx - u_rect.x, ty - u_rect.y) / u_rect.w;
      if (a.x >= 0.0 && a.x < 1.0 && a.y >= 0.0 && a.y < 1.0 && texture2D(u_mask, a).r > 0.5) {
        color = texture2D(u_atlas, a).rgb;
        tiled = true;
      }
    }
  }

  if (u_shaded > 0.5) {
    // Sun from the upper left, a darker limb, and a thin blue haze right at
    // the edge, which is what makes a flat texture read as a planet.
    vec3 normal = vec3(x, y, z);
    vec3 light = normalize(vec3(-0.45, 0.55, 0.7));
    float diffuse = clamp(dot(normal, light), 0.0, 1.0);
    float shade = 0.58 + 0.42 * diffuse;
    float rim = pow(1.0 - z, 3.0);
    color = mix(color * shade, vec3(0.55, 0.75, 0.95), rim * 0.45);
  }

  gl_FragColor = vec4(color * alpha, alpha);
}
`;

type Scene = {
  gl: ExpoWebGLRenderingContext;
  program: WebGLProgram;
  atlas: WebGLTexture;
  mask: WebGLTexture;
  u: Record<
    | 'center'
    | 'radius'
    | 'height'
    | 'centreGeo'
    | 'rect'
    | 'useTiles'
    | 'useEarth'
    | 'flat'
    | 'shaded'
    | 'linear'
    | 'centreTile'
    | 'tilesPerUnit',
    WebGLUniformLocation | null
  >;
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

/** Decoded tiles by URL, most recently used last. Shared by both views. */
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
 * visible (then the fallback is what should show).
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
 * Streamed tiles wrapped onto the globe. Sits under the vector layer, which
 * keeps drawing pins and labels on top; the SVG leaves the disc transparent
 * while this has something to show.
 */
export default function TileLayer({
  width,
  height,
  cx,
  cy,
  radius,
  rotation,
  source,
  fallback,
  shaded,
  onStatus,
}: TileLayerProps) {
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
  const status = useRef<ImageryStatus>('idle');
  const landed = useRef(0);
  const failures = useRef(0);
  const onStatusRef = useRef(onStatus);
  useEffect(() => {
    onStatusRef.current = onStatus;
  }, [onStatus]);
  const setStatus = useCallback((next: ImageryStatus) => {
    if (status.current === next) return;
    status.current = next;
    onStatusRef.current?.(next);
  }, []);

  const onContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
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
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW
      );
      const aPos = gl.getAttribLocation(program, 'a_pos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // Unit 0: the whole earth, only loaded when this layer falls back to it.
      // Wrap east-west so the antimeridian seam disappears; mipmaps keep the
      // zoomed-out view from shimmering.
      const base = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, base);
      if (fallback.kind === 'earth') {
        const image = await loadBaseTexture();
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image as never);
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
      } else {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          1,
          1,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          new Uint8Array([0, 0, 0, 255])
        );
      }
      gl.uniform1i(gl.getUniformLocation(program, 'u_tex'), 0);

      // Unit 1: the tile atlas, an 8×8 window of the tile grid. Tiles are chosen
      // to match screen resolution, so plain linear filtering is enough.
      const atlasTex = gl.createTexture();
      if (!atlasTex) return;
      const atlasSize = ATLAS_TILES * source.tileSize;
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

      const loc = (name: string) => gl.getUniformLocation(program, name);
      scene.current = {
        gl,
        program,
        atlas: atlasTex,
        mask: maskTex,
        u: {
          center: loc('u_center'),
          radius: loc('u_radius'),
          height: loc('u_height'),
          centreGeo: loc('u_centreGeo'),
          rect: loc('u_rect'),
          useTiles: loc('u_useTiles'),
          useEarth: loc('u_useEarth'),
          flat: loc('u_flat'),
          shaded: loc('u_shaded'),
          linear: loc('u_linear'),
          centreTile: loc('u_centreTile'),
          tilesPerUnit: loc('u_tilesPerUnit'),
        },
      };
      setReady(true);
    },
    [fallback.kind, source.tileSize]
  );

  /** Copy a decoded tile into its atlas cell and flag the cell as ready. */
  const placeTile = useCallback(
    (i: number, j: number, tile: TilePixels) => {
      const s = scene.current;
      const a = atlas.current;
      if (!s || !a) return;
      const { gl } = s;
      const size = source.tileSize;
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
    },
    [source.tileSize]
  );

  /** Work through the queue, a few downloads at a time. */
  const pump = useCallback(() => {
    while (inFlight.current < MAX_PARALLEL && queue.current.length > 0) {
      const job = queue.current.shift();
      const a = atlas.current;
      if (!job || !a || job.generation !== a.generation) continue;
      const url = tileUrl(source, a.rect.z, a.rect.x0 + job.i, a.rect.y0 + job.j);
      if (failed.has(url)) continue;
      const cached = cacheGet(url);
      if (cached) {
        placeTile(job.i, job.j, cached);
        landed.current += 1;
        setStatus('live');
        continue;
      }
      inFlight.current += 1;
      loadTile(url, source.tileSize)
        .then((tile) => {
          cachePut(url, tile);
          landed.current += 1;
          failures.current = 0;
          setStatus('live');
          if (atlas.current?.generation === job.generation) {
            placeTile(job.i, job.j, tile);
            redraw.current();
          }
        })
        .catch(() => {
          failed.add(url);
          failures.current += 1;
          if (landed.current === 0 && failures.current >= FAILURES_BEFORE_GIVING_UP) {
            setStatus('unavailable');
          }
        })
        .finally(() => {
          inFlight.current -= 1;
          pumpRef.current();
        });
    }
    redraw.current();
  }, [placeTile, setStatus, source]);

  useEffect(() => {
    pumpRef.current = pump;
  }, [pump]);

  useEffect(() => () => clearTimeout(settle.current), []);

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

  /** Point the atlas at a new window of tiles and start filling it. */
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
    if (isEnabled(source)) {
      const bounds = visibleBounds(width, height, cx, cy, radius, rotation);
      const plan = bounds ? planAtlas(bounds, radius * k, source) : null;
      if (!plan) {
        if (status.current !== 'unavailable') setStatus('idle');
      } else {
        useTiles = true;
        if (status.current === 'idle') setStatus('loading');
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
      const { u } = s;
      gl.viewport(0, 0, bw, bh);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(s.program);
      gl.uniform2f(u.center, cx * k, cy * k);
      gl.uniform1f(u.radius, radius * k);
      gl.uniform1f(u.height, bh);
      const toRad = Math.PI / 180;
      const centreLon = -rotation[0];
      const centreLat = -rotation[1];
      gl.uniform2f(u.centreGeo, centreLon * toRad, centreLat * toRad);
      gl.uniform1f(u.useTiles, useTiles && a ? 1 : 0);
      gl.uniform1f(u.useEarth, fallback.kind === 'earth' ? 1 : 0);
      const flat = fallback.kind === 'flat' ? fallback.color : [0, 0, 0];
      gl.uniform3f(u.flat, flat[0], flat[1], flat[2]);
      gl.uniform1f(u.shaded, shaded ? 1 : 0);
      if (a) gl.uniform4f(u.rect, a.rect.x0, a.rect.y0, 2 ** a.rect.z, ATLAS_TILES);

      // Deep zoom: hand the shader the view centre in tile space (double
      // precision, relative to the atlas origin) and the local scale, so it
      // never has to subtract two large numbers in 32-bit floats.
      const linear = radius * k > LINEAR_FROM_RADIUS && a !== null;
      gl.uniform1f(u.linear, linear ? 1 : 0);
      if (linear && a) {
        const n = 2 ** a.rect.z;
        const [tx, ty] = lonLatToTile(centreLon, centreLat, a.rect.z);
        gl.uniform2f(u.centreTile, tx - a.rect.x0, ty - a.rect.y0);
        // Mercator is conformal, so both axes stretch by 1/cos(lat) at the centre.
        const perUnit = n / (2 * Math.PI * Math.cos(centreLat * toRad));
        gl.uniform2f(u.tilesPerUnit, perUnit, -perUnit);
      }
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.endFrameEXP();
    };
    redraw.current = draw;
    draw();
  }, [
    ready,
    width,
    height,
    cx,
    cy,
    radius,
    rotation,
    refill,
    ensure,
    setStatus,
    source,
    fallback,
    shaded,
  ]);

  return (
    <GLView
      style={[StyleSheet.absoluteFill, { width, height }]}
      pointerEvents="none"
      onContextCreate={onContextCreate}
    />
  );
}
