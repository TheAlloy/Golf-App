import { Asset } from 'expo-asset';
import { ExpoWebGLRenderingContext, GLView } from 'expo-gl';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';

/**
 * NASA Blue Marble (public domain), 4096×2048 equirectangular. Bundled so the
 * terrain view works offline and never depends on a tile server.
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
// sphere → longitude/latitude → equirectangular texel. The maths mirrors
// d3-geo's rotate([λ, φ]), which puts (−λ, −φ) at the centre of the disc.
const FRAG = `
precision highp float;
uniform vec2 u_center;
uniform float u_radius;
uniform float u_height;
uniform vec2 u_centreGeo;
uniform sampler2D u_tex;
const float PI = 3.141592653589793;

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

  vec2 uv = vec2(fract((lon + PI) / (2.0 * PI)), (PI * 0.5 - lat) / PI);
  vec3 color = texture2D(u_tex, uv).rgb;

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
  uCenter: WebGLUniformLocation | null;
  uRadius: WebGLUniformLocation | null;
  uHeight: WebGLUniformLocation | null;
  uCentreGeo: WebGLUniformLocation | null;
};

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
async function loadTexture(): Promise<Asset | HTMLImageElement> {
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
 * Satellite imagery wrapped onto the globe. Sits under the vector layer, which
 * keeps drawing borders, pins and labels on top; the SVG leaves the disc
 * transparent while this is mounted.
 */
export default function TerrainLayer({ width, height, cx, cy, radius, rotation }: Props) {
  const scene = useRef<Scene | null>(null);
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

    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const source = await loadTexture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source as never);
    // Wrap east-west so the antimeridian seam disappears; mipmaps keep the
    // whole-world view from shimmering, since it shows the 4k texture at ~350px.
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

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);

    scene.current = {
      gl,
      program,
      uCenter: gl.getUniformLocation(program, 'u_center'),
      uRadius: gl.getUniformLocation(program, 'u_radius'),
      uHeight: gl.getUniformLocation(program, 'u_height'),
      uCentreGeo: gl.getUniformLocation(program, 'u_centreGeo'),
    };
    setReady(true);
  }, []);

  useEffect(() => {
    const s = scene.current;
    if (!s || !ready) return;
    const { gl } = s;
    const bw = gl.drawingBufferWidth;
    const bh = gl.drawingBufferHeight;
    if (!bw || !bh) return;
    // Layout pixels → buffer pixels (device pixel ratio).
    const k = bw / width;
    gl.viewport(0, 0, bw, bh);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(s.program);
    gl.uniform2f(s.uCenter, cx * k, cy * k);
    gl.uniform1f(s.uRadius, radius * k);
    gl.uniform1f(s.uHeight, bh);
    const toRad = Math.PI / 180;
    gl.uniform2f(s.uCentreGeo, -rotation[0] * toRad, -rotation[1] * toRad);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.endFrameEXP();
  }, [ready, width, height, cx, cy, radius, rotation]);

  return (
    <GLView
      style={[StyleSheet.absoluteFill, { width, height }]}
      pointerEvents="none"
      onContextCreate={onContextCreate}
    />
  );
}
