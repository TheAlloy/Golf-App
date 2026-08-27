import { HoleScore, Round } from '@/models/types';

export type AggregateStats = {
  fairwaysHit: number;
  fairwayChances: number;
  greensInRegulation: number;
  girChances: number;
  putts: number;
  holesWithPutts: number;
};

/** Roll up the hole-by-hole detail across every round that has a scorecard. */
export function aggregateStats(rounds: Round[]): AggregateStats {
  const totals: AggregateStats = {
    fairwaysHit: 0,
    fairwayChances: 0,
    greensInRegulation: 0,
    girChances: 0,
    putts: 0,
    holesWithPutts: 0,
  };

  for (const round of rounds) {
    for (const hole of round.holeScores ?? []) {
      if (hole.fairwayHit !== undefined) {
        totals.fairwayChances += 1;
        if (hole.fairwayHit) totals.fairwaysHit += 1;
      }
      if (hole.gir !== undefined) {
        totals.girChances += 1;
        if (hole.gir) totals.greensInRegulation += 1;
      }
      if (hole.putts !== undefined) {
        totals.putts += hole.putts;
        totals.holesWithPutts += 1;
      }
    }
  }

  return totals;
}

/** Sum of strokes entered on a scorecard, or undefined if none are. */
export function scorecardTotal(holeScores: HoleScore[] | undefined): number | undefined {
  const strokes = (holeScores ?? []).map((h) => h?.strokes).filter((s): s is number => !!s);
  return strokes.length ? strokes.reduce((a, b) => a + b, 0) : undefined;
}
