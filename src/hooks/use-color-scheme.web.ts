import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';

/**
 * To support static rendering, the server snapshot is always 'light' and the
 * real scheme is picked up on the client after hydration.
 */
export function useColorScheme() {
  return useSyncExternalStore(
    (onChange) => {
      const sub = Appearance.addChangeListener(onChange);
      return () => sub.remove();
    },
    () => Appearance.getColorScheme() ?? 'light',
    () => 'light'
  );
}
