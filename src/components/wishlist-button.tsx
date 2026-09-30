import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { useAppStore, useIsWishlisted } from '@/store/use-app-store';

/** Heart toggle that adds a course to, or removes it from, the wishlist. */
export function WishlistButton({ courseId, className }: { courseId: string; className?: string }) {
  const wished = useIsWishlisted(courseId);
  const toggle = useAppStore((s) => s.toggleWishlist);
  return (
    <Pressable
      className={cn(
        'h-9 w-9 items-center justify-center rounded-full',
        wished ? 'bg-destructive/20' : 'bg-elevated',
        className
      )}
      onPress={() => toggle(courseId)}
      hitSlop={6}
      accessibilityLabel={wished ? 'Remove from wishlist' : 'Add to wishlist'}
      accessibilityState={{ selected: wished }}
    >
      <Ionicons
        name={wished ? 'heart' : 'heart-outline'}
        size={18}
        color={wished ? colors.destructive : colors.mutedForeground}
      />
    </Pressable>
  );
}
