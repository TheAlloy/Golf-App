import { Course } from '@/models/types';

/**
 * The globe's heat map is built from the rounds you have logged — nothing
 * else. An account with no rounds sees an unlit world, and every glow on it is
 * somewhere you have actually played.
 *
 * Nearby courses are merged into one blob so a cluster of local rounds reads as
 * a single bright area rather than a scatter of identical dots.
 */
export type HeatCell = {
  latitude: number;
  longitude: number;
  /** Number of distinct courses feeding this blob. */
  courses: number;
  /** Total rounds played across those courses. */
  rounds: number;
};

/** Courses within roughly this distance merge into one glow. */
const MERGE_DEGREES = 1.5;

export function buildHeatCells(
  playedCourses: { course: Course; rounds: number }[]
): HeatCell[] {
  const bins = new Map<string, { lat: number; lng: number; courses: number; rounds: number }>();

  for (const { course, rounds } of playedCourses) {
    const { latitude, longitude } = course.coordinate;
    const key = `${Math.floor(latitude / MERGE_DEGREES)}:${Math.floor(longitude / MERGE_DEGREES)}`;
    const existing = bins.get(key);
    if (existing) {
      existing.lat += latitude;
      existing.lng += longitude;
      existing.courses += 1;
      existing.rounds += rounds;
    } else {
      bins.set(key, { lat: latitude, lng: longitude, courses: 1, rounds });
    }
  }

  // Average position within each bin so the glow sits over the real cluster.
  return [...bins.values()].map((b) => ({
    latitude: b.lat / b.courses,
    longitude: b.lng / b.courses,
    courses: b.courses,
    rounds: b.rounds,
  }));
}

/**
 * Position on the heat ramp, 0–1, for a blob covering this many courses.
 * Log-scaled so the first few courses in a region are clearly visible and a
 * long-standing home region still reads as the hottest point.
 */
export function heatIntensity(courses: number, max = 50): number {
  return Math.min(1, Math.log(courses + 1) / Math.log(max + 1));
}
