import { computeAchievements } from '@/lib/achievements';
import { coursePoints, repeatPlayPoints, totalPoints } from '@/lib/points';
import { wishlistProgress } from '@/lib/wishlist';
import { Course, Round, WishlistItem } from '@/models/types';

/**
 * Levels climb roughly doubling, so the first few come quickly and the later
 * ones need real travel.
 */
export const LEVELS = [
  { min: 0, name: 'Range Rat' },
  { min: 100, name: 'Weekend Hacker' },
  { min: 300, name: 'Club Golfer' },
  { min: 700, name: 'Single Figures' },
  { min: 1500, name: 'Scratch' },
  { min: 3000, name: 'Tour Card' },
  { min: 6000, name: 'Major Winner' },
  { min: 12000, name: 'Legend' },
];

export type Level = {
  number: number;
  name: string;
  /** Points at which this level starts. */
  min: number;
  /** Points needed for the next level, or null at the top. */
  next: number | null;
  nextName: string | null;
  /** 0–1 through the current level. */
  progress: number;
};

export function levelFor(points: number): Level {
  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].min) i++;
  const current = LEVELS[i];
  const upcoming = LEVELS[i + 1];
  return {
    number: i + 1,
    name: current.name,
    min: current.min,
    next: upcoming?.min ?? null,
    nextName: upcoming?.name ?? null,
    progress: upcoming ? (points - current.min) / (upcoming.min - current.min) : 1,
  };
}

/**
 * Playing a wishlisted course doubles its rarity points: the bonus equals
 * the course's first-play value.
 */
export function dreamBonus(course: Course): number {
  return coursePoints(course);
}

/**
 * What playing a wishlisted course will earn: its rarity points (or the
 * repeat rate if you have played it before) plus the dream bonus.
 */
export function wishReward(course: Course, alreadyPlayed: boolean): number {
  return (alreadyPlayed ? repeatPlayPoints(course) : coursePoints(course)) + dreamBonus(course);
}

export type Progression = {
  total: number;
  rarity: number;
  dreams: number;
  achievements: number;
  level: Level;
};

export function computeProgression(
  rounds: Round[],
  courses: Map<string, Course>,
  wishlist: WishlistItem[]
): Progression {
  const rarity = totalPoints(rounds, courses);
  const dreams = wishlistProgress(wishlist, rounds).reduce((sum, w) => {
    const course = courses.get(w.courseId);
    return w.completedRound && course ? sum + dreamBonus(course) : sum;
  }, 0);
  const achievements = computeAchievements(rounds, courses, wishlist)
    .filter((a) => a.earned)
    .reduce((sum, a) => sum + a.points, 0);
  const total = rarity + dreams + achievements;
  return { total, rarity, dreams, achievements, level: levelFor(total) };
}
