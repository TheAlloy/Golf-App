import { Round, WishlistItem } from '@/models/types';

export type WishlistEntry = WishlistItem & {
  /** The first round logged at the course after it was wished for. */
  completedRound?: Round;
};

/**
 * A wish counts as ticked off by the first round logged at that course after
 * it went on the list. Rounds logged earlier don't count, otherwise wishing
 * for courses you have already played would be free points.
 */
export function wishlistProgress(wishlist: WishlistItem[], rounds: Round[]): WishlistEntry[] {
  return wishlist.map((item) => {
    const completedRound = rounds
      .filter((r) => r.courseId === item.courseId && r.createdAt >= item.addedAt)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    return { ...item, completedRound };
  });
}
