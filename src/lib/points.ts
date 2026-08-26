import { Course, Round } from '@/models/types';

/**
 * Rarity points: every course is worth a base 10 points plus a bonus that
 * grows as popularity shrinks, so ticking off a course few people have
 * played is worth far more than another lap of a famous venue.
 *
 *   popularity 95 (St Andrews)  -> 15 pts
 *   popularity 50               -> 60 pts
 *   popularity  5 (hidden gem)  -> 105 pts
 *
 * The first round at a course earns full points; repeat rounds earn 10%
 * (minimum 1) so playing often still counts for something.
 */
export const BASE_POINTS = 10;
export const REPEAT_PLAY_RATE = 0.1;

export function coursePoints(course: Course): number {
  const popularity = Math.min(100, Math.max(0, course.popularity));
  return Math.round(BASE_POINTS + (100 - popularity));
}

export function repeatPlayPoints(course: Course): number {
  return Math.max(1, Math.round(coursePoints(course) * REPEAT_PLAY_RATE));
}

export function totalPoints(rounds: Round[], coursesById: Map<string, Course>): number {
  const seen = new Set<string>();
  let total = 0;
  for (const round of [...rounds].sort((a, b) => a.date.localeCompare(b.date))) {
    const course = coursesById.get(round.courseId);
    if (!course) continue;
    if (seen.has(course.id)) {
      total += repeatPlayPoints(course);
    } else {
      seen.add(course.id);
      total += coursePoints(course);
    }
  }
  return total;
}
