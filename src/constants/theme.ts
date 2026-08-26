import { useColorScheme } from 'react-native';

/**
 * The same tokens as src/global.css, for the handful of places that need a
 * real colour value rather than a Tailwind class: navigation options and
 * map markers, which are configured through props, not styles.
 *
 * Keep in step with global.css when the theme changes.
 */
export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  destructive: string;
};

export const themeColors: Record<'light' | 'dark', ThemeColors> = {
  light: {
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(20, 13.8%, 4.1%)',
    card: 'hsl(0, 0%, 100%)',
    primary: 'hsl(221, 97.1%, 53.5%)',
    primaryForeground: 'hsl(214, 96.5%, 96.8%)',
    muted: 'hsl(60, 3.6%, 95.9%)',
    mutedForeground: 'hsl(25, 5.9%, 44.6%)',
    border: 'hsl(20, 6.9%, 90%)',
    destructive: 'hsl(357, 100%, 45.3%)',
  },
  dark: {
    background: 'hsl(20, 13.8%, 4.1%)',
    foreground: 'hsl(60, 7.1%, 97.9%)',
    card: 'hsl(24, 9.6%, 10%)',
    primary: 'hsl(216, 100%, 58.5%)',
    primaryForeground: 'hsl(20, 13.8%, 4.1%)',
    muted: 'hsl(12, 7.2%, 15.1%)',
    mutedForeground: 'hsl(24, 5.8%, 63.1%)',
    border: 'hsl(12, 7.2%, 15.1%)',
    destructive: 'hsl(357, 95.9%, 57.7%)',
  },
};

export function useThemeColors(): ThemeColors {
  return themeColors[useColorScheme() === 'dark' ? 'dark' : 'light'];
}

/** Map marker colours: played courses take the theme accent. */
export const MARKER_PLAYED = themeColors.light.primary;
export const MARKER_UNPLAYED = themeColors.light.mutedForeground;
