import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { computeAchievements } from '@/lib/achievements';
import { Progression } from '@/lib/progression';
import { wishlistProgress } from '@/lib/wishlist';
import { Course, Round, WishlistItem } from '@/models/types';

type Props = {
  visible: boolean;
  onClose: () => void;
  progression: Progression;
  rounds: Round[];
  courses: Map<string, Course>;
  wishlist: WishlistItem[];
  friendCount: number;
};

/**
 * One-screen summary behind the points pill: level and progress, the headline
 * counts, where the points came from, and links on to the full pages. Sized
 * to fit a phone without scrolling.
 */
export function ProgressSummary({
  visible,
  onClose,
  progression,
  rounds,
  courses,
  wishlist,
  friendCount,
}: Props) {
  const router = useRouter();
  const { level } = progression;

  const stats = useMemo(() => {
    const played = new Set(rounds.map((r) => r.courseId));
    const countries = new Set(
      [...played].map((id) => courses.get(id)?.country).filter((c): c is string => Boolean(c))
    );
    const wishes = wishlistProgress(wishlist, rounds);
    const badges = computeAchievements(rounds, courses, wishlist);
    return {
      courses: played.size,
      countries: countries.size,
      rounds: rounds.length,
      wishesDone: wishes.filter((w) => w.completedRound).length,
      wishes: wishes.length,
      badgesEarned: badges.filter((b) => b.earned).length,
      badges: badges.length,
    };
  }, [courses, rounds, wishlist]);

  const go = (path: '/achievements' | '/friends') => {
    onClose();
    router.push(path);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop closes; the card swallows its own taps. */}
      <Pressable
        className="flex-1 items-center justify-center bg-black/60 px-5"
        onPress={onClose}
        accessibilityLabel="Close summary"
      >
        <Pressable
          className="w-full max-w-sm gap-4 rounded-3xl border border-border bg-elevated p-5"
          onPress={() => {}}
          accessibilityViewIsModal
        >
          {/* Level and points */}
          <View className="flex-row items-start justify-between">
            <View className="flex-1 gap-0.5">
              <Text className="text-xs uppercase tracking-wide text-muted-foreground">
                Level {level.number}
              </Text>
              <Text className="font-bold text-2xl text-foreground">{level.name}</Text>
              <View className="flex-row items-center gap-1.5">
                <Ionicons name="sparkles" size={14} color={colors.warm} />
                <Text className="font-semibold text-base text-foreground">
                  {progression.total.toLocaleString()} points
                </Text>
              </View>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full bg-card active:opacity-70"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={18} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Progress to the next level */}
          <View className="gap-1.5">
            <View className="h-2 overflow-hidden rounded-full bg-card">
              <View
                className="h-full rounded-full bg-primary-bright"
                style={{ width: `${Math.round(Math.max(0.02, level.progress) * 100)}%` }}
              />
            </View>
            <Text className="text-xs text-muted-foreground">
              {level.next
                ? `${(level.next - progression.total).toLocaleString()} points to ${level.nextName}`
                : 'Top level reached'}
            </Text>
          </View>

          {/* Headline counts */}
          <View className="gap-2">
            <View className="flex-row gap-2">
              <StatTile className="bg-card" label="Courses" value={String(stats.courses)} />
              <StatTile className="bg-card" label="Countries" value={String(stats.countries)} />
              <StatTile className="bg-card" label="Rounds" value={String(stats.rounds)} />
            </View>
            <View className="flex-row gap-2">
              <StatTile
                className="bg-card"
                label="Wishlist"
                value={`${stats.wishesDone}/${stats.wishes}`}
                delta="ticked off"
              />
              <StatTile
                className="bg-card"
                label="Badges"
                value={`${stats.badgesEarned}/${stats.badges}`}
                delta="earned"
              />
              <StatTile className="bg-card" label="Friends" value={String(friendCount)} />
            </View>
          </View>

          {/* Where the points came from */}
          <View className="flex-row items-center justify-between rounded-xl bg-card px-3 py-2">
            <Source label="Rarity" value={progression.rarity} />
            <Source label="Dream bonus" value={progression.dreams} />
            <Source label="Badges" value={progression.achievements} />
          </View>

          {/* On to the full pages */}
          <View className="flex-row gap-2">
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full bg-primary py-2.5 active:opacity-80"
              onPress={() => go('/achievements')}
              accessibilityRole="button"
            >
              <Ionicons name="trophy-outline" size={15} color={colors.primaryForeground} />
              <Text className="font-semibold text-sm text-primary-foreground">Achievements</Text>
            </Pressable>
            <Pressable
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-full border border-border bg-card py-2.5 active:opacity-80"
              onPress={() => go('/friends')}
              accessibilityRole="button"
            >
              <Ionicons name="people-outline" size={15} color={colors.foreground} />
              <Text className="font-semibold text-sm text-foreground">Friends</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Source({ label, value }: { label: string; value: number }) {
  return (
    <View className="items-center">
      <Text className="font-semibold text-sm text-foreground">{value.toLocaleString()}</Text>
      <Text className="text-[10px] text-muted-foreground">{label}</Text>
    </View>
  );
}
