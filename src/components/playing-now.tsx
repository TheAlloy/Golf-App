import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { checkInStatus, initialsOf, names, whenLabel } from '@/lib/check-ins';
import { CheckIn } from '@/models/types';
import { useAppStore } from '@/store/use-app-store';

/**
 * "Playing now" as a list: one row per tag with the player's disc, who's
 * with them, and where and when. Your own rows carry an End button.
 */
export function PlayingNowList({
  checkIns,
  onPress,
  showCourse = true,
  title = 'Playing now',
}: {
  checkIns: CheckIn[];
  onPress?: (checkIn: CheckIn) => void;
  /** Name the course on each row; off when every row is at the same course. */
  showCourse?: boolean;
  title?: string | null;
}) {
  const endCheckIn = useAppStore((s) => s.endCheckIn);
  if (checkIns.length === 0) return null;
  return (
    <View className="gap-2 pb-2">
      {title && (
        <View className="flex-row items-center gap-2 pb-2 pt-4">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: colors.info }} />
          <Text className="font-semibold text-sm text-foreground">{title}</Text>
        </View>
      )}
      {checkIns.map((c) => {
        const me = c.by === 'me';
        const now = checkInStatus(c) === 'now';
        const who = me ? 'You' : c.byName;
        const withNames = c.with.map((p) => p.name);
        return (
          <Pressable
            key={c.id}
            className="flex-row items-center gap-3 rounded-xl bg-card p-3 active:opacity-80"
            onPress={onPress ? () => onPress(c) : undefined}
            disabled={!onPress}
            accessibilityRole={onPress ? 'button' : undefined}
          >
            <View
              className="h-11 w-11 items-center justify-center rounded-full"
              style={{ backgroundColor: c.byColor }}
            >
              <Text className="font-bold text-base" style={{ color: '#06240f' }}>
                {initialsOf(who)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-semibold text-sm text-foreground" numberOfLines={1}>
                {who}
                {withNames.length ? ` with ${names(withNames)}` : ''}
              </Text>
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {showCourse ? `${c.courseName} · ` : ''}
                {now ? `playing ${whenLabel(c)}` : `tee time ${whenLabel(c)}`}
              </Text>
              {c.note && (
                <Text className="mt-1 text-[11px] text-muted-foreground" numberOfLines={2}>
                  “{c.note}”
                </Text>
              )}
            </View>
            {me ? (
              <Pressable
                className="h-8 items-center justify-center rounded-full bg-muted px-3 active:opacity-70"
                onPress={() => endCheckIn(c.id)}
                accessibilityRole="button"
                accessibilityLabel="End tag"
                hitSlop={6}
              >
                <Text className="font-semibold text-xs text-foreground">End</Text>
              </Pressable>
            ) : (
              onPress && (
                <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
              )
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
