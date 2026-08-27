import { HoleScore, Round } from '@/models/types';

export type AggregateStats = {
  fairwaysHit: number;
  fairwayChances: number;
  greensInRegulation: number;
  girChances: number;
  putts: number;
  holesWithPutts: number;
};

/**
 * Green in regulation: on the putting surface with two putts left to make par,
 * i.e. strokes - putts <= par - 2. Derived rather than entered, since every
 * input it needs is already on the card.
 */
export function girForHole(hole: HoleScore | undefined, par: number | undefined): boolean {
  if (!hole || hole.strokes === undefined || hole.putts === undefined || par === undefined) {
    return false;
  }
  return hole.strokes - hole.putts <= par - 2;
}

/** Roll up hole-by-hole detail across every round that has a scorecard. */
export function aggregateStats(rounds: Round[], pars?: Map<string, number[] | undefined>): AggregateStats {
  const totals: AggregateStats = {
    fairwaysHit: 0,
    fairwayChances: 0,
    greensInRegulation: 0,
    girChances: 0,
    putts: 0,
    holesWithPutts: 0,
  };

  for (const round of rounds) {
    const holePars = pars?.get(round.courseId);
    (round.holeScores ?? []).forEach((hole, i) => {
      if (!hole) return;
      const par = holePars?.[i];

      if (hole.fairwayHit !== undefined) {
        totals.fairwayChances += 1;
        if (hole.fairwayHit) totals.fairwaysHit += 1;
      }
      if (hole.putts !== undefined) {
        totals.putts += hole.putts;
        totals.holesWithPutts += 1;
      }
      if (hole.strokes !== undefined && hole.putts !== undefined && par !== undefined) {
        totals.girChances += 1;
        if (girForHole(hole, par)) totals.greensInRegulation += 1;
      }
    });
  }

  return totals;
}

/** Sum of strokes entered on a scorecard, or undefined if none are. */
export function scorecardTotal(holeScores: HoleScore[] | undefined): number | undefined {
  const strokes = (holeScores ?? []).map((h) => h?.strokes).filter((s): s is number => !!s);
  return strokes.length ? strokes.reduce((a, b) => a + b, 0) : undefined;
}
