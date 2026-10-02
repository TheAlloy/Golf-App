import { useEffect, useState } from 'react';

import { LatLng } from '@/models/types';

/**
 * Current wind at a point, from Open-Meteo: free, no key, and the one call
 * returns speed, gusts and the direction the wind blows from.
 */
export type Wind = {
  /** mph. */
  speed: number;
  gusts: number;
  /** Degrees, meteorological: where the wind comes from, clockwise from north. */
  fromDeg: number;
  /** ISO time of the observation. */
  at: string;
};

export type WindState =
  { kind: 'loading' } | { kind: 'ready'; wind: Wind } | { kind: 'unavailable' };

const REFRESH_MS = 10 * 60 * 1000;

export async function fetchWind(point: LatLng): Promise<Wind> {
  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${point.latitude.toFixed(4)}&longitude=${point.longitude.toFixed(4)}` +
    '&current=wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=mph';
  const response = await fetch(url);
  if (!response.ok) throw new Error(`wind ${response.status}`);
  const json = (await response.json()) as {
    current: {
      time: string;
      wind_speed_10m: number;
      wind_direction_10m: number;
      wind_gusts_10m: number;
    };
  };
  return {
    speed: json.current.wind_speed_10m,
    gusts: json.current.wind_gusts_10m,
    fromDeg: json.current.wind_direction_10m,
    at: json.current.time,
  };
}

/** Wind at the course, refreshed every ten minutes while mounted. */
export function useWind(point: LatLng | undefined): WindState {
  const [state, setState] = useState<WindState>({ kind: 'loading' });
  const lat = point?.latitude;
  const lon = point?.longitude;
  useEffect(() => {
    if (lat === undefined || lon === undefined) return;
    let live = true;
    const load = () =>
      fetchWind({ latitude: lat, longitude: lon }).then(
        (wind) => live && setState({ kind: 'ready', wind }),
        () => live && setState({ kind: 'unavailable' })
      );
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [lat, lon]);
  return state;
}
