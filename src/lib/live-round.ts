import { Course, LiveRound } from '@/models/types';

/** Par for a hole: the catalogue's where it has one, else what was set on the card. */
export function liveHolePar(course: Course, live: LiveRound, hole: number): number | undefined {
  return course.holePars?.[hole - 1] ?? live.pars[hole];
}
