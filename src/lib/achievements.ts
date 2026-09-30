import { aggregateStats } from '@/lib/stats';
import { wishlistProgress } from '@/lib/wishlist';
import { Course, Round, WishlistItem } from '@/models/types';

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export type Achievement = {
  id: string;
  name: string;
  description: string;
  /** Ionicons name. */
  icon: string;
  tier: AchievementTier;
  /** Points added to the player's total once earned. */
  points: number;
  earned: boolean;
  /** Progress toward earning it, 0–1. */
  progress: number;
  detail: string;
};

export const TIER_POINTS: Record<AchievementTier, number> = { bronze: 25, silver: 100, gold: 250 };

/**
 * Achievements are computed from rounds and the wishlist rather than stored,
 * so they stay correct if a round is edited or deleted.
 */
export function computeAchievements(
  rounds: Round[],
  courses: Map<string, Course>,
  wishlist: WishlistItem[] = []
): Achievement[] {
  const played = new Set(rounds.map((r) => r.courseId));
  const countries = new Set([...played].map((id) => courses.get(id)?.country).filter(Boolean));
  const continents = new Set(
    [...played].map((id) => courses.get(id)?.continent).filter(Boolean)
  );
  const stats = aggregateStats(rounds);
  const dreams = wishlistProgress(wishlist, rounds).filter((w) => w.completedRound).length;
  const hiddenGems = [...played].filter((id) => (courses.get(id)?.popularity ?? 100) <= 20).length;

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
    tier: AchievementTier,
    value: number,
    target: number,
    unit = ''
  ): Achievement => ({
    id,
    name,
    description,
    icon,
    tier,
    points: TIER_POINTS[tier],
    earned: value >= target,
    progress: Math.min(1, target === 0 ? 0 : value / target),
    detail: `${Math.min(value, target)}${unit} / ${target}${unit}`,
  });

  return [
    make('first-round', 'First Tee', 'Log your first round', 'flag', 'bronze', rounds.length, 1),
    make('dreamer', 'Dreamer', 'Add 5 courses to your wishlist', 'heart', 'bronze', wishlist.length, 5),
    make('dream-round', 'Dream Round', 'Play a course from your wishlist', 'sparkles', 'silver', dreams, 1),
    make('bucket-list', 'Bucket List', 'Play 5 courses from your wishlist', 'ribbon', 'gold', dreams, 5),
    make('hidden-gem', 'Hidden Gem', 'Play a course fewer than 1 in 5 golfers have', 'diamond', 'silver', hiddenGems, 1),
    make('ten-courses', 'Explorer', 'Play 10 different courses', 'compass', 'silver', played.size, 10),
    make('globetrotter', 'Globetrotter', 'Play in 3 countries', 'earth', 'silver', countries.size, 3),
    make('continental', 'Continental', 'Play on 3 continents', 'globe', 'gold', continents.size, 3),
    make('under-par', 'Red Numbers', 'Finish a round under par', 'trending-down', 'gold', underPar, 1),
    make('birdie-hunter', 'Birdie Hunter', 'Make 25 birdies', 'flash', 'silver', birdies, 25),
    make(
      'fairway-finder',
      'Fairway Finder',
      'Hit 60% of fairways across your scorecards',
      'golf',
      'silver',
      Math.round(fairwayPct * 100),
      60,
      '%'
    ),
    make(
      'green-machine',
      'Green Machine',
      'Hit 50% of greens in regulation',
      'disc',
      'gold',
      Math.round(girPct * 100),
      50,
      '%'
    ),
    make('century', 'Century', 'Log 100 rounds', 'trophy', 'gold', rounds.length, 100),
  ];
}
