import * as Location from 'expo-location';
import { useEffect, useState } from 'react';

import { LatLng } from '@/models/types';

export type Fix = {
  coordinate: LatLng;
  /** Metres, when the device reports it. */
  accuracy?: number;
  /** Degrees clockwise from north, when moving. */
  heading?: number;
  at: number;
};

export type LocationState =
  { kind: 'waiting' } | { kind: 'fix'; fix: Fix } | { kind: 'denied' } | { kind: 'unavailable' };

/**
 * Follows the player around the course while mounted. High accuracy with a
 * small distance filter: a few metres matter when you're pacing a wedge.
 */
export function useLiveLocation(enabled: boolean): LocationState {
  const [state, setState] = useState<LocationState>({ kind: 'waiting' });

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    let subscription: Location.LocationSubscription | null = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!live) return;
        if (status !== 'granted') {
          setState({ kind: 'denied' });
          return;
        }
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 2,
            timeInterval: 2000,
          },
          (position) => {
            if (!live) return;
            setState({
              kind: 'fix',
              fix: {
                coordinate: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                },
                accuracy: position.coords.accuracy ?? undefined,
                heading:
                  position.coords.heading !== null && position.coords.heading >= 0
                    ? position.coords.heading
                    : undefined,
                at: position.timestamp,
              },
            });
          }
        );
      } catch {
        if (live) setState({ kind: 'unavailable' });
      }
    })();
    return () => {
      live = false;
      subscription?.remove();
    };
  }, [enabled]);

  return state;
}
