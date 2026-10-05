/**
 * Streamed satellite imagery for the terrain view.
 *
 * Tiles are standard Web Mercator XYZ tiles. The default source is EOX's
 * Sentinel-2 cloudless mosaic, which is free to use with attribution and needs
 * no key, at roughly 10 m per pixel. Point the env vars at another provider
 * (Esri, Mapbox, MapTiler, …) for sharper imagery; see the README.
 */

export type ImagerySource = {
  /** URL template with {z}, {x} and {y} placeholders. */
  template: string;
  /** Deepest tile zoom the provider serves. */
  maxZoom: number;
  /** Tile edge in pixels, 256 or 512. */
  tileSize: number;
  /** Shown over the globe while imagery is on screen. */
  attribution: string;
};

const DEFAULT_SOURCE: ImagerySource = {
  template: 'https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg',
  maxZoom: 14,
  tileSize: 256,
  attribution: 'Sentinel-2 cloudless by EOX',
};

function envNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const IMAGERY: ImagerySource = {
  template: process.env.EXPO_PUBLIC_IMAGERY_TILES || DEFAULT_SOURCE.template,
  maxZoom: envNumber(process.env.EXPO_PUBLIC_IMAGERY_MAX_ZOOM, DEFAULT_SOURCE.maxZoom),
  tileSize: envNumber(process.env.EXPO_PUBLIC_IMAGERY_TILE_SIZE, DEFAULT_SOURCE.tileSize),
  attribution: process.env.EXPO_PUBLIC_IMAGERY_ATTRIBUTION ?? DEFAULT_SOURCE.attribution,
};

/**
 * Imagery for the course map in a live round, which needs to resolve
 * fairways and greens: zoom 17–19, a metre a pixel or better. Esri's World
 * Imagery serves that free for non-commercial use with attribution; swap the
 * env vars for Mapbox, MapTiler or Google in a commercial build.
 */
const DEFAULT_COURSE_SOURCE: ImagerySource = {
  template:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 19,
  tileSize: 256,
  attribution: 'Esri, Maxar, Earthstar Geographics',
};

export const COURSE_IMAGERY: ImagerySource = {
  template: process.env.EXPO_PUBLIC_COURSE_TILES || DEFAULT_COURSE_SOURCE.template,
  maxZoom: envNumber(process.env.EXPO_PUBLIC_COURSE_MAX_ZOOM, DEFAULT_COURSE_SOURCE.maxZoom),
  tileSize: envNumber(process.env.EXPO_PUBLIC_COURSE_TILE_SIZE, DEFAULT_COURSE_SOURCE.tileSize),
  attribution: process.env.EXPO_PUBLIC_COURSE_ATTRIBUTION ?? DEFAULT_COURSE_SOURCE.attribution,
};

export function courseTileUrl(z: number, x: number, y: number): string {
  return COURSE_IMAGERY.template
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

/** Set EXPO_PUBLIC_IMAGERY_TILES=off to disable streaming and keep the bundled texture. */
export const IMAGERY_ENABLED = IMAGERY.template.toLowerCase() !== 'off';

/**
 * The terrain look: shaded relief with hypsometric tints and no labels, in
 * the manner of a topographic map. Esri's World Terrain Base is free for
 * non-commercial use with attribution. Must share the satellite source's
 * tile size, since both stream into the same atlas.
 */
const DEFAULT_TERRAIN_SOURCE: ImagerySource = {
  template:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 13,
  tileSize: 256,
  attribution: 'Esri, USGS, NOAA',
};

export const TERRAIN_IMAGERY: ImagerySource = {
  template: process.env.EXPO_PUBLIC_TERRAIN_TILES || DEFAULT_TERRAIN_SOURCE.template,
  maxZoom: envNumber(process.env.EXPO_PUBLIC_TERRAIN_MAX_ZOOM, DEFAULT_TERRAIN_SOURCE.maxZoom),
  tileSize: IMAGERY.tileSize,
  attribution: process.env.EXPO_PUBLIC_TERRAIN_ATTRIBUTION ?? DEFAULT_TERRAIN_SOURCE.attribution,
};

export const TERRAIN_ENABLED = TERRAIN_IMAGERY.template.toLowerCase() !== 'off';

export function tileUrlFrom(source: ImagerySource, z: number, x: number, y: number): string {
  return source.template
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

export function tileUrl(z: number, x: number, y: number): string {
  return tileUrlFrom(IMAGERY, z, x, y);
}

/** Tiles on each side of the atlas texture; the atlas is a contiguous window of the tile grid. */
export const ATLAS_TILES = 8;

/** Web Mercator's latitude limit; nothing is tiled beyond it. */
export const MERCATOR_MAX_LAT = 85.0511;

export type TileRect = {
  z: number;
  /** Top-left tile of the atlas window. */
  x0: number;
  y0: number;
};

export type LonLatBounds = [[number, number], [number, number]];

/** Fractional tile coordinates of a point at zoom z. */
export function lonLatToTile(lon: number, lat: number, z: number): [number, number] {
  const n = 2 ** z;
  const phi = (Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat)) * Math.PI) / 180;
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n;
  return [x, y];
}

/**
 * Tile zoom whose pixels roughly match the screen's, for a globe of the given
 * radius in device pixels. One tile row spans 2π of longitude, so tile pixels
 * per radian is tileSize·2^z / 2π; the globe's is its radius.
 */
export function zoomForRadius(radiusPx: number, tileSize: number, maxZoom: number): number {
  const z = Math.round(Math.log2((radiusPx * 2 * Math.PI) / tileSize));
  return Math.max(0, Math.min(maxZoom, z));
}

type NeededRect = { x0: number; y0: number; x1: number; y1: number };

function neededTiles(bounds: LonLatBounds, z: number): NeededRect {
  const [[lon0, lat0], [lon1, lat1]] = bounds;
  const [xa, yb] = lonLatToTile(lon0, lat1, z); // north-west corner
  const [xb, ya] = lonLatToTile(lon1, lat0, z); // south-east corner
  const n = 2 ** z;
  return {
    x0: Math.max(0, Math.floor(xa)),
    y0: Math.max(0, Math.floor(yb)),
    x1: Math.min(n - 1, Math.floor(xb)),
    y1: Math.min(n - 1, Math.floor(ya)),
  };
}

/**
 * Pick the tile zoom and atlas window for what's on screen. Drops a zoom level
 * while the visible area needs more tiles than the atlas holds, then centres
 * the atlas window on the visible tiles so there is room to pan before a
 * refill is needed. Null when imagery can't help (window off the mercator
 * range, or nothing to show).
 */
export function planAtlas(
  bounds: LonLatBounds,
  radiusPx: number,
  source: ImagerySource
): { rect: TileRect; needed: NeededRect } | null {
  if (bounds[1][1] < -MERCATOR_MAX_LAT || bounds[0][1] > MERCATOR_MAX_LAT) return null;
  let z = zoomForRadius(radiusPx, source.tileSize, source.maxZoom);
  let needed = neededTiles(bounds, z);
  while (z > 0 && (needed.x1 - needed.x0 >= ATLAS_TILES || needed.y1 - needed.y0 >= ATLAS_TILES)) {
    z -= 1;
    needed = neededTiles(bounds, z);
  }
  if (needed.x1 < needed.x0 || needed.y1 < needed.y0) return null;
  const n = 2 ** z;
  const span = (a: number, b: number) => {
    const start = Math.round((a + b) / 2 - ATLAS_TILES / 2);
    return Math.max(0, Math.min(n - ATLAS_TILES, start));
  };
  return {
    rect: { z, x0: span(needed.x0, needed.x1), y0: span(needed.y0, needed.y1) },
    needed,
  };
}

/** Whether every tile the view needs is inside the atlas window. */
export function covers(rect: TileRect, needed: NeededRect): boolean {
  return (
    needed.x0 >= rect.x0 &&
    needed.y0 >= rect.y0 &&
    needed.x1 < rect.x0 + ATLAS_TILES &&
    needed.y1 < rect.y0 + ATLAS_TILES
  );
}

/**
 * Atlas cells worth loading for this view: the tiles under the viewport plus
 * a one-tile margin so a small pan finds imagery already there, nearest the
 * centre first. The rest of the atlas is left empty until the view reaches it,
 * which keeps tile requests (and provider quotas) proportional to what is seen.
 */
export function wantedCells(rect: TileRect, needed: NeededRect): [number, number][] {
  const n = 2 ** rect.z;
  const cx = (needed.x0 + needed.x1) / 2 - rect.x0;
  const cy = (needed.y0 + needed.y1) / 2 - rect.y0;
  const cells: [number, number][] = [];
  for (let y = needed.y0 - 1; y <= needed.y1 + 1; y++) {
    for (let x = needed.x0 - 1; x <= needed.x1 + 1; x++) {
      const i = x - rect.x0;
      const j = y - rect.y0;
      if (i < 0 || j < 0 || i >= ATLAS_TILES || j >= ATLAS_TILES) continue;
      if (x < 0 || y < 0 || x >= n || y >= n) continue;
      cells.push([i, j]);
    }
  }
  return cells.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
}
