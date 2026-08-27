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
    background: 'hsl(222, 47%, 4%)',
    foreground: 'hsl(210, 20%, 98%)',
    card: 'hsl(222, 40%, 8%)',
    cardElevated: 'hsl(222, 36%, 11%)',
    primary: 'hsl(82, 78%, 55%)',
    primaryForeground: 'hsl(222, 47%, 6%)',
    muted: 'hsl(222, 30%, 14%)',
    mutedForeground: 'hsl(215, 16%, 62%)',
    border: 'hsl(222, 26%, 17%)',
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
 * Heat ramp for the globe: courses you have played glow warmer as the count
 * in that area rises, matching the city-lights look of the design.
 */
export const HEAT_RAMP = ['hsl(246, 80%, 60%)', 'hsl(291, 70%, 62%)', 'hsl(33, 96%, 58%)'];

export const GLOBE_COLORS = {
  ocean: 'hsl(222, 45%, 7%)',
  land: 'hsl(215, 24%, 21%)',
  landStroke: 'hsl(210, 22%, 32%)',
  graticule: 'hsl(222, 26%, 13%)',
  atmosphere: 'hsl(205, 90%, 60%)',
  played: 'hsl(82, 78%, 55%)',
};
