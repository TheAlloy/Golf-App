import { Course, Round } from '@/models/types';

/**
 * Handicap index, derived from logged rounds.
 *
 * The World Handicap System computes each round's differential as
 * (113 / slope) x (score - course rating - PCC), then averages the best 8 of
 * the last 20 and multiplies by 0.96. Slope and course rating are licensed
 * data we do not have, so this uses score-against-par in their place and keeps
 * the rest of the method intact.
 *
 * That makes it a good working estimate, not an official handicap — it will
 * read a little low on hard courses and a little high on easy ones. Swap in
 * real ratings when a course-data provider is licensed.
 */
export const HANDICAP_MIN_ROUNDS = 3;
const RECENT_ROUNDS = 20;
const ADJUSTMENT = 0.96;

/** How many of the most recent rounds count, per the WHS table. */
function countingRounds(total: number): number {
  if (total < 3) return 0;
  if (total <= 4) return 1;
  if (total <= 6) return 2;
  if (total <= 8) return 3;
  if (total <= 11) return 4;
  if (total <= 14) return 5;
  if (total <= 16) return 6;
  if (total <= 18) return 7;
  return 8;
}

export type HandicapResult = {
  index: number | null;
  /** Rounds still needed before an index can be shown. */
  roundsNeeded: number;
  usedRounds: number;
};

export function calculateHandicap(
  rounds: Round[],
  courses: Map<string, Course>
): HandicapResult {
  const differentials = [...rounds]
    .filter((r) => r.score !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, RECENT_ROUNDS)
    .map((r) => {
      const course = courses.get(r.courseId);
      if (!course || r.score === undefined) return null;
      // Nine-hole rounds are doubled to an 18-hole equivalent.
      const par = r.holesPlayed === 9 ? Math.round(course.par / 2) : course.par;
      const diff = r.score - par;
      return r.holesPlayed === 9 ? diff * 2 : diff;
    })
    .filter((d): d is number => d !== null);

  const counting = countingRounds(differentials.length);
  if (counting === 0) {
    return {
      index: null,
      roundsNeeded: HANDICAP_MIN_ROUNDS - differentials.length,
      usedRounds: differentials.length,
    };
  }

  const best = [...differentials].sort((a, b) => a - b).slice(0, counting);
  const average = best.reduce((sum, d) => sum + d, 0) / best.length;

  return {
    index: Math.round(Math.max(-10, average * ADJUSTMENT) * 10) / 10,
    roundsNeeded: 0,
    usedRounds: counting,
  };
}

export function formatHandicap(index: number | null): string {
  if (index === null) return '—';
  return index < 0 ? `+${Math.abs(index).toFixed(1)}` : index.toFixed(1);
}
