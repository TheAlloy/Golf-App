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
 * Terrain look: natural ocean blues and vegetation greens over the same
 * geometry, with a sun-lit shading pass laid over the sphere. Pins, labels
 * and callouts keep the map palette so they read the same in both.
 */
export const GLOBE_TERRAIN_COLORS: GlobePalette = {
  ...GLOBE_COLORS,
  oceanHigh: 'hsl(204, 58%, 36%)',
  ocean: 'hsl(208, 62%, 24%)',
  oceanDeep: 'hsl(214, 66%, 13%)',
  land: 'hsl(96, 28%, 34%)',
  landStroke: 'hsl(88, 26%, 46%)',
  graticule: 'hsla(200, 60%, 80%, 0.10)',
  atmosphere: 'hsl(200, 85%, 72%)',
  limb: 'hsl(200, 70%, 72%)',
  // Lifted so a played dot still reads against vegetation green.
  pin: 'hsl(158, 80%, 46%)',
};

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
};
