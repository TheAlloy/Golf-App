import { aggregateStats } from '@/lib/stats';
import { Course, Round } from '@/models/types';

export type Achievement = {
  id: string;
  name: string;
  description: string;
  /** Ionicons name. */
  icon: string;
  earned: boolean;
  /** Progress toward earning it, 0–1. */
  progress: number;
  detail: string;
};

/**
 * Achievements are computed from rounds rather than stored, so they stay
 * correct if a round is edited or deleted.
 */
export function computeAchievements(
  rounds: Round[],
  courses: Map<string, Course>
): Achievement[] {
  const played = new Set(rounds.map((r) => r.courseId));
  const countries = new Set(
    [...played].map((id) => courses.get(id)?.country).filter(Boolean)
  );
  const continents = new Set(
    [...played].map((id) => courses.get(id)?.continent).filter(Boolean)
  );
  const stats = aggregateStats(rounds);

  const underPar = rounds.filter((r) => (r.toPar ?? 1) < 0).length;
  const birdies = rounds.reduce((total, r) => {
    const course = courses.get(r.courseId);
    if (!course?.holePars) return total;
    return (
      total +
      (r.holeScores ?? []).filter((h, i) => {
        const par = course.holePars?.[i];
        return h?.strokes !== undefined && par !== undefined && h.strokes < par;
      }).length
    );
  }, 0);

  const fairwayPct = stats.fairwayChances ? stats.fairwaysHit / stats.fairwayChances : 0;
  const girPct = stats.girChances ? stats.greensInRegulation / stats.girChances : 0;

  const make = (
    id: string,
    name: string,
    description: string,
    icon: string,
    value: number,
    target: number,
    unit: string
  ): Achievement => ({
    id,
    name,
    description,
    icon,
    earned: value >= target,
    progress: Math.min(1, target === 0 ? 0 : value / target),
    detail: `${Math.min(value, target)}${unit} / ${target}${unit}`,
  });

  return [
    make('first-round', 'First Tee', 'Log your first round', 'flag', rounds.length, 1, ''),
    make('ten-courses', 'Explorer', 'Play 10 different courses', 'compass', played.size, 10, ''),
    make('globetrotter', 'Globetrotter', 'Play in 3 countries', 'earth', countries.size, 3, ''),
    make('continental', 'Continental', 'Play on 3 continents', 'globe', continents.size, 3, ''),
    make('under-par', 'Red Numbers', 'Finish a round under par', 'trending-down', underPar, 1, ''),
    make('birdie-hunter', 'Birdie Hunter', 'Make 25 birdies', 'bird', birdies, 25, ''),
    make(
      'fairway-finder',
      'Fairway Finder',
      'Hit 60% of fairways across your scorecards',
      'golf',
      Math.round(fairwayPct * 100),
      60,
      '%'
    ),
    make(
      'green-machine',
      'Green Machine',
      'Hit 50% of greens in regulation',
      'disc',
      Math.round(girPct * 100),
      50,
      '%'
    ),
    make('century', 'Century', 'Log 100 rounds', 'trophy', rounds.length, 100, ''),
  ];
}
