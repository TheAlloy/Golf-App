/**
 * Streamed map tiles for the globe.
 *
 * Both appearances sharpen with standard Web Mercator XYZ tiles as you zoom
 * in. The defaults are keyless, free-to-use sources with the most detail
 * available: Esri World Imagery for the terrain view and CARTO Dark Matter
 * (OpenStreetMap data) for the dark map. Both require their attribution to be
 * shown, which the app does over the globe. Point the env vars at another
 * provider to change either; see the README.
 */

export type TileSource = {
  /** URL template with {z}, {x} and {y} placeholders; {s} picks a subdomain a–d. */
  template: string;
  /** Deepest tile zoom the provider serves. */
  maxZoom: number;
  /** Tile edge in pixels, 256 or 512. */
  tileSize: number;
  /** Shown over the globe while these tiles are on screen. */
  attribution: string;
};

/** Kept for callers that predate the second source. */
export type ImagerySource = TileSource;

const DEFAULT_IMAGERY: TileSource = {
  template:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  maxZoom: 19,
  tileSize: 256,
  attribution: 'Esri, Maxar, Earthstar Geographics',
};

const DEFAULT_BASEMAP: TileSource = {
  template: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  maxZoom: 20,
  tileSize: 256,
  attribution: 'OpenStreetMap contributors, CARTO',
};

function envNumber(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

type EnvOverrides = {
  tiles?: string;
  maxZoom?: string;
  tileSize?: string;
  attribution?: string;
};

// Expo inlines EXPO_PUBLIC_* only when each variable is named literally, so
// the lookups are spelled out rather than built from a prefix.
function fromEnv(env: EnvOverrides, fallback: TileSource): TileSource {
  return {
    template: env.tiles || fallback.template,
    maxZoom: envNumber(env.maxZoom, fallback.maxZoom),
    tileSize: envNumber(env.tileSize, fallback.tileSize),
    attribution: env.attribution ?? fallback.attribution,
  };
}

/** Satellite imagery for the terrain view. */
export const IMAGERY: TileSource = fromEnv(
  {
    tiles: process.env.EXPO_PUBLIC_IMAGERY_TILES,
    maxZoom: process.env.EXPO_PUBLIC_IMAGERY_MAX_ZOOM,
    tileSize: process.env.EXPO_PUBLIC_IMAGERY_TILE_SIZE,
    attribution: process.env.EXPO_PUBLIC_IMAGERY_ATTRIBUTION,
  },
  DEFAULT_IMAGERY
);
/** Dark street map for the map view. */
export const BASEMAP: TileSource = fromEnv(
  {
    tiles: process.env.EXPO_PUBLIC_BASEMAP_TILES,
    maxZoom: process.env.EXPO_PUBLIC_BASEMAP_MAX_ZOOM,
    tileSize: process.env.EXPO_PUBLIC_BASEMAP_TILE_SIZE,
    attribution: process.env.EXPO_PUBLIC_BASEMAP_ATTRIBUTION,
  },
  DEFAULT_BASEMAP
);

/** Set a source's TILES variable to `off` to disable streaming for that view. */
export const isEnabled = (source: TileSource) => source.template.toLowerCase() !== 'off';
export const IMAGERY_ENABLED = isEnabled(IMAGERY);
export const BASEMAP_ENABLED = isEnabled(BASEMAP);

export function tileUrl(source: TileSource, z: number, x: number, y: number): string {
  return source.template
    .replace('{s}', 'abcd'[(x + y) % 4])
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
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
 * refill is needed. Null when tiles can't help (window off the mercator
 * range, or nothing to show).
 */
export function planAtlas(
  bounds: LonLatBounds,
  radiusPx: number,
  source: TileSource
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
    return Math.max(0, Math.min(Math.max(0, n - ATLAS_TILES), start));
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
