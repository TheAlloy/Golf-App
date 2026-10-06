import { Continent } from '@/models/types';

/**
 * The same tokens as src/global.css, for the places that need a real colour
 * value rather than a Tailwind class: navigation options, map markers, SVG
 * fills on the globe, and gradients.
 *
 * Keep in step with global.css when the theme changes.
 */
export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  cardElevated: string;
  primary: string;
  primaryBright: string;
  primaryForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  destructive: string;
  info: string;
  warm: string;
};

export const colors: ThemeColors = {
  background: 'hsl(0, 0%, 3%)',
  foreground: 'hsl(0, 0%, 98%)',
  card: 'hsl(0, 0%, 7%)',
  cardElevated: 'hsl(0, 0%, 10.5%)',
  primary: '#06402b',
  primaryForeground: 'hsl(0, 0%, 98%)',
  primaryBright: 'hsl(158, 55%, 46%)',
  muted: 'hsl(0, 0%, 13%)',
  mutedForeground: 'hsl(0, 0%, 60%)',
  border: 'hsl(0, 0%, 16%)',
  destructive: 'hsl(0, 84%, 60%)',
  info: 'hsl(199, 89%, 58%)',
  warm: 'hsl(33, 96%, 58%)',
};

/**
 * Kept as a hook so call sites stay unchanged if a second theme is ever
 * added; today it always returns the single dark palette.
 */
export function useThemeColors(): ThemeColors {
  return colors;
}

export const GLOBE_COLORS = {
  oceanHigh: 'hsl(0, 0%, 11%)',
  ocean: 'hsl(0, 0%, 6.5%)',
  oceanDeep: 'hsl(0, 0%, 3%)',
  land: 'hsl(0, 0%, 17%)',
  landStroke: 'hsl(0, 0%, 27%)',
  graticule: 'hsl(0, 0%, 12%)',
  atmosphere: 'hsl(0, 0%, 82%)',
  limb: 'hsl(0, 0%, 72%)',
  pin: 'hsl(158, 83%, 30%)',
  wishlist: 'hsl(68, 92%, 60%)',
  pinLabel: 'hsl(0, 0%, 90%)',
  callout: 'hsla(0, 0%, 6%, 0.92)',
  calloutEdge: 'hsla(0, 0%, 100%, 0.12)',
};

export type GlobePalette = typeof GLOBE_COLORS;

/**
 * Terrain look. The disc itself is satellite imagery drawn by TerrainLayer;
 * these only style what the vector layer still draws over it: a pale
 * atmosphere, faint country borders, and pins lifted to read on green land.
 */
export const GLOBE_TERRAIN_COLORS: GlobePalette = {
  ...GLOBE_COLORS,
  oceanHigh: 'hsl(204, 58%, 36%)',
  ocean: 'hsl(208, 62%, 24%)',
  oceanDeep: 'hsl(214, 66%, 13%)',
  land: 'hsl(96, 28%, 34%)',
  landStroke: 'hsla(0, 0%, 100%, 0.28)',
  graticule: 'hsla(200, 60%, 80%, 0.10)',
  atmosphere: 'hsl(200, 85%, 72%)',
  limb: 'hsl(200, 70%, 72%)',
  // Lifted so a played dot still reads against vegetation green.
  pin: 'hsl(158, 80%, 46%)',
};

/**
 * Terrain look: a pale relief map, so borders go dark and pins drop to the
 * deep green to keep their contrast.
 */
export const GLOBE_RELIEF_COLORS: GlobePalette = {
  ...GLOBE_TERRAIN_COLORS,
  landStroke: 'hsla(0, 0%, 0%, 0.35)',
  atmosphere: 'hsl(200, 60%, 80%)',
  limb: 'hsl(200, 40%, 70%)',
  pin: 'hsl(158, 83%, 30%)',
};

/**
 * One hue per continent for the "where I've played" shading, chosen to read
 * apart from each other and from the green and lime pins over dark land.
 */
export const CONTINENT_HUES: Record<Continent, { h: number; s: number; l: number }> = {
  'North America': { h: 199, s: 89, l: 58 },
  'South America': { h: 330, s: 80, l: 62 },
  Europe: { h: 158, s: 80, l: 50 },
  Africa: { h: 40, s: 96, l: 58 },
  Asia: { h: 14, s: 90, l: 60 },
  Australia: { h: 265, s: 80, l: 70 },
};

/** Translucent fill and a firmer edge for a continent's shading. */
export function continentShade(continent: Continent): {
  fill: string;
  edge: string;
  swatch: string;
} {
  const { h, s, l } = CONTINENT_HUES[continent];
  return {
    fill: `hsla(${h}, ${s}%, ${l}%, 0.34)`,
    edge: `hsla(${h}, ${s}%, ${Math.min(90, l + 14)}%, 0.85)`,
    swatch: `hsl(${h}, ${s}%, ${l}%)`,
  };
}

/** Medal colours for achievement tiers. */
export const TIER_COLORS = {
  bronze: 'hsl(28, 62%, 55%)',
  silver: 'hsl(0, 0%, 74%)',
  gold: 'hsl(45, 96%, 58%)',
};

/** Translucent medal fills behind earned badges. */
export const TIER_TINTS = {
  bronze: 'hsla(28, 62%, 55%, 0.18)',
  silver: 'hsla(0, 0%, 74%, 0.18)',
  gold: 'hsla(45, 96%, 58%, 0.18)',
};

/** Floating tab bar and its log-a-round button. */
export const NAV_COLORS = {
  pill: '#06402b',
  pillEdge: 'hsla(150, 60%, 70%, 0.12)',
  // A touch stronger than on black, so inactive icons still read on green.
  icon: 'hsla(0, 0%, 100%, 0.55)',
  iconActive: 'hsl(0, 0%, 98%)',
  // Disc behind the selected tab: the pill's green, deeper.
  active: '#032a1c',
  // Dot on the club icon while a round is being recorded.
  live: 'hsl(68, 92%, 60%)',
  // The raised disc behind the + in the middle, and the glyph on it.
  prominent: 'hsl(158, 55%, 46%)',
  prominentIcon: '#032a1c',
};
