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
 * Heat ramp for the globe. A region glows further along the ramp the more
 * courses you have played there: indigo for a first visit, magenta as it
 * fills in, amber for a home patch you know inside out.
 */
export const HEAT_STOPS = ['hsl(248, 84%, 62%)', 'hsl(295, 78%, 60%)', 'hsl(35, 98%, 60%)'];

export const GLOBE_COLORS = {
  oceanHigh: 'hsl(222, 46%, 13%)',
  ocean: 'hsl(223, 48%, 8%)',
  oceanDeep: 'hsl(226, 56%, 4%)',
  land: 'hsl(217, 28%, 18%)',
  landStroke: 'hsl(212, 26%, 28%)',
  graticule: 'hsl(220, 30%, 14%)',
  atmosphere: 'hsl(206, 92%, 62%)',
  limb: 'hsl(203, 90%, 72%)',
  pin: 'hsl(82, 78%, 58%)',
  pinLabel: 'hsl(210, 24%, 88%)',
};
