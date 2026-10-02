import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { WishlistButton } from '@/components/wishlist-button';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { coursePoints } from '@/lib/points';
import { Course } from '@/models/types';

type Props = {
  course: Course;
  played?: boolean;
  /** Ticked off from the wishlist; replaces the heart with a badge. */
  completed?: boolean;
  className?: string;
};

/** A course in a list: where it is, what it's worth, and a wishlist heart. */
export function CourseCard({ course, played, completed, className }: Props) {
  const router = useRouter();
  const place = [course.city, course.region || course.country].filter(Boolean).join(', ');

  return (
    <Pressable
      className={cn(
        'flex-row items-center gap-3 rounded-xl bg-card p-3 active:opacity-80',
        className
      )}
      onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
    >
      <View
        className={cn(
          'h-11 w-11 items-center justify-center rounded-lg',
          played ? 'bg-primary-bright/20' : 'bg-elevated'
        )}
      >
        <Ionicons
          name={played ? 'flag' : 'flag-outline'}
          size={18}
          color={played ? colors.primaryBright : colors.mutedForeground}
        />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-sm text-foreground" numberOfLines={1}>
          {course.name}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {place || course.country} · {course.holes} holes
        </Text>
        <View className="mt-1 flex-row items-center gap-1">
          <Ionicons name="sparkles" size={11} color={colors.warm} />
          <Text className="font-semibold text-[11px]" style={{ color: colors.warm }}>
            {coursePoints(course)} pts
          </Text>
          {played && <Text className="text-[11px] text-muted-foreground"> · Played</Text>}
        </View>
      </View>
      {completed ? (
        <View className="flex-row items-center gap-1 rounded-full bg-primary-bright/20 px-3 py-1">
          <Ionicons name="checkmark" size={12} color={colors.primaryBright} />
          <Text className="font-semibold text-[11px] text-primary-bright">Ticked off</Text>
        </View>
      ) : (
        <WishlistButton courseId={course.id} />
      )}
    </Pressable>
  );
}
