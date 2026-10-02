import { LatLng } from '@/models/types';

const EARTH_RADIUS_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const phi1 = rad(a.latitude);
  const phi2 = rad(b.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

export type Units = 'yd' | 'm';

const M_PER_YD = 0.9144;

export function toUnits(metres: number, units: Units): number {
  return units === 'yd' ? metres / M_PER_YD : metres;
}

export function fromUnits(value: number, units: Units): number {
  return units === 'yd' ? value * M_PER_YD : value;
}

/** "148 yd" / "135 m", rounded to the whole unit the way a rangefinder reads. */
export function formatDistance(metres: number, units: Units): string {
  return `${Math.round(toUnits(metres, units))} ${units}`;
}

/*
 * Web Mercator, in "world pixels" at a given fractional zoom: the whole
 * planet is 256·2^z pixels across, so screen position is a subtraction.
 */
export const TILE_PX = 256;
export const MERCATOR_MAX_LAT = 85.0511;

export function project(point: LatLng, zoom: number): { x: number; y: number } {
  const scale = TILE_PX * 2 ** zoom;
  const lat = Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, point.latitude));
  const phi = rad(lat);
  return {
    x: ((point.longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * scale,
  };
}

export function unproject(x: number, y: number, zoom: number): LatLng {
  const scale = TILE_PX * 2 ** zoom;
  const lon = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  return { latitude: deg(Math.atan(Math.sinh(n))), longitude: lon };
}

/** Ground metres covered by one screen pixel at this latitude and zoom. */
export function metresPerPixel(latitude: number, zoom: number): number {
  return (156_543.03392 * Math.cos(rad(latitude))) / 2 ** zoom;
}
