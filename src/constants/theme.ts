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
    primary: 'hsl(82, 78%, 55%)',
    primaryForeground: 'hsl(0, 0%, 5%)',
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

/**
 * Heat ramp for the globe, in the lime family so it sits with the accent. A
 * region glows further along the ramp the more courses you have played
 * there: deep green for a first visit, lime as it fills in, yellow-green for
 * a home patch you know inside out.
 */
export const HEAT_STOPS = ['hsl(145, 62%, 36%)', 'hsl(88, 78%, 50%)', 'hsl(62, 96%, 62%)'];

export const GLOBE_COLORS = {
  oceanHigh: 'hsl(0, 0%, 11%)',
  ocean: 'hsl(0, 0%, 6.5%)',
  oceanDeep: 'hsl(0, 0%, 3%)',
  land: 'hsl(0, 0%, 17%)',
  landStroke: 'hsl(0, 0%, 27%)',
  graticule: 'hsl(0, 0%, 12%)',
  atmosphere: 'hsl(0, 0%, 82%)',
  limb: 'hsl(0, 0%, 72%)',
  pin: 'hsl(82, 78%, 58%)',
  wishlist: 'hsl(330, 90%, 68%)',
  pinLabel: 'hsl(0, 0%, 90%)',
  callout: 'hsla(0, 0%, 6%, 0.92)',
  calloutEdge: 'hsla(0, 0%, 100%, 0.12)',
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
