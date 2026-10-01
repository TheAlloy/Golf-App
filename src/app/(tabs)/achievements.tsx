import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarSpace } from '@/components/tab-bar';
import { Button } from '@/components/ui/button';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { colors, TIER_COLORS, TIER_TINTS } from '@/constants/theme';
import { Achievement, computeAchievements } from '@/lib/achievements';
import { cn } from '@/lib/cn';
import { computeProgression, wishReward } from '@/lib/progression';
import { wishlistProgress } from '@/lib/wishlist';
import { usePlayedCourseIds, usePlayerData } from '@/store/use-app-store';

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { rounds, wishlist, courses } = usePlayerData();
  const playedIds = usePlayedCourseIds();

  const progression = useMemo(
    () => computeProgression(rounds, courses, wishlist),
    [courses, rounds, wishlist]
  );
  const achievements = useMemo(
    () => computeAchievements(rounds, courses, wishlist),
    [courses, rounds, wishlist]
  );
  const earned = achievements.filter((a) => a.earned);
  const closest = achievements.filter((a) => !a.earned).sort((a, b) => b.progress - a.progress)[0];

  // Open quests: wishlisted courses not yet ticked off, biggest reward first.
  const quests = useMemo(
    () =>
      wishlistProgress(wishlist, rounds)
        .filter((w) => !w.completedRound)
        .map((w) => courses.get(w.courseId))
        .filter((c) => c !== undefined)
        .map((course) => ({ course, reward: wishReward(course, playedIds.has(course.id)) }))
        .sort((a, b) => b.reward - a.reward),
    [courses, playedIds, rounds, wishlist]
  );
  const ticked = wishlist.length - quests.length;

  const { level } = progression;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        indicatorStyle="white"
        contentContainerClassName="gap-4 px-4"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabSpace + 24 }}
      >
        <View>
          <Text className="font-bold text-2xl text-foreground">Achievements</Text>
          <Text className="text-xs text-muted-foreground">
            Play your wishlist, collect points, level up.
          </Text>
        </View>

        {/* Level */}
        <View className="overflow-hidden rounded-2xl bg-card p-5">
          <View className="flex-row items-center gap-4">
            <View
              className="h-20 w-20 items-center justify-center rounded-full border-4"
              style={{ borderColor: colors.primaryBright }}
            >
              <Text className="text-[10px] text-muted-foreground">LEVEL</Text>
              <Text className="font-bold text-3xl text-foreground">{level.number}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-xl text-foreground">{level.name}</Text>
              <View className="mt-0.5 flex-row items-center gap-1">
                <Ionicons name="sparkles" size={14} color={colors.warm} />
                <Text className="font-bold text-base" style={{ color: colors.warm }}>
                  {progression.total.toLocaleString()} pts
                </Text>
              </View>
            </View>
          </View>
          <View className="mt-4 h-2.5 overflow-hidden rounded-full bg-elevated">
            <View
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(3, level.progress * 100)}%` }}
            />
          </View>
          <Text className="mt-1.5 text-xs text-muted-foreground">
            {level.next === null
              ? 'Top of the ladder.'
              : `${(level.next - progression.total).toLocaleString()} pts to ${level.nextName}`}
          </Text>
        </View>

        {/* Where the points came from */}
        <View className="flex-row gap-2">
          <StatTile
            label="Rarity"
            value={String(progression.rarity)}
            icon={<Ionicons name="diamond-outline" size={14} color={colors.info} />}
          />
          <StatTile
            label="Dream bonus"
            value={String(progression.dreams)}
            icon={<Ionicons name="heart-outline" size={14} color={colors.destructive} />}
          />
          <StatTile
            label="Badges"
            value={String(progression.achievements)}
            icon={<Ionicons name="medal-outline" size={14} color={TIER_COLORS.gold} />}
          />
        </View>

        {/* Wishlist quests */}
        <View className="rounded-2xl bg-card p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="map" size={16} color={colors.primaryBright} />
              <Text className="font-semibold text-base">Wishlist quests</Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              {ticked} / {wishlist.length} complete
            </Text>
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">
            A course from your wishlist scores double the first time you play it after adding it.
          </Text>

          {wishlist.length === 0 ? (
            <View className="mt-3 items-start gap-3">
              <Text className="text-sm text-muted-foreground">
                No quests yet. Wishlist some courses and they turn into bounties here.
              </Text>
              <Button size="sm" onPress={() => router.push('/explore')}>
                <Text>Explore courses</Text>
              </Button>
            </View>
          ) : quests.length === 0 ? (
            <Text className="mt-3 text-sm text-primary-bright">
              Every wishlist course played. Time to dream bigger.
            </Text>
          ) : (
            <View className="mt-3 gap-2">
              {quests.slice(0, 6).map(({ course, reward }) => (
                <Pressable
                  key={course.id}
                  className="flex-row items-center gap-3 rounded-xl bg-elevated p-3 active:opacity-80"
                  onPress={() =>
                    router.push({ pathname: '/course/[id]', params: { id: course.id } })
                  }
                >
                  <View className="flex-1">
                    <Text className="font-semibold text-sm" numberOfLines={1}>
                      {course.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      {[course.city, course.region || course.country].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="font-bold text-base" style={{ color: colors.warm }}>
                      +{reward}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">pts</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                </Pressable>
              ))}
              {quests.length > 6 && (
                <Text className="text-xs text-muted-foreground">
                  +{quests.length - 6} more on your wishlist
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Closest badge, to give a next goal */}
        {closest && (
          <View className="flex-row items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
            <Ionicons name="flag" size={18} color={colors.primaryBright} />
            <View className="flex-1">
              <Text className="font-semibold text-sm">Next up: {closest.name}</Text>
              <Text className="text-xs text-muted-foreground">
                {closest.description} · {closest.detail}
              </Text>
            </View>
            <Text className="font-bold text-sm text-primary-bright">+{closest.points}</Text>
          </View>
        )}

        {/* Badges */}
        <View>
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-semibold text-base">Badges</Text>
            <Text className="text-xs text-muted-foreground">
              {earned.length} / {achievements.length} earned
            </Text>
          </View>
          <View className="flex-row flex-wrap justify-between gap-y-2">
            {achievements.map((a) => (
              <Badge key={a.id} achievement={a} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Badge({ achievement: a }: { achievement: Achievement }) {
  const medal = TIER_COLORS[a.tier];
  return (
    <View
      className={cn('items-center rounded-2xl p-3', a.earned ? 'bg-card' : 'bg-card/60')}
      style={{ width: '31.5%' }}
    >
      <View
        className="h-14 w-14 items-center justify-center rounded-full border-2"
        style={{
          borderColor: a.earned ? medal : colors.border,
          backgroundColor: a.earned ? TIER_TINTS[a.tier] : 'transparent',
        }}
      >
        <Ionicons
          name={(a.earned ? a.icon : 'lock-closed') as keyof typeof Ionicons.glyphMap}
          size={a.earned ? 24 : 18}
          color={a.earned ? medal : colors.mutedForeground}
        />
      </View>
      <Text
        className={cn(
          'mt-2 text-center font-semibold text-xs',
          a.earned ? 'text-foreground' : 'text-muted-foreground'
        )}
        numberOfLines={1}
      >
        {a.name}
      </Text>
      <Text className="mt-0.5 text-center text-[10px] text-muted-foreground" numberOfLines={2}>
        {a.description}
      </Text>
      {a.earned ? (
        <Text className="mt-1.5 font-semibold text-[10px]" style={{ color: medal }}>
          +{a.points} pts
        </Text>
      ) : (
        <View className="mt-2 h-1 w-full overflow-hidden rounded-full bg-elevated">
          <View
            className="h-full rounded-full"
            style={{ width: `${Math.max(4, a.progress * 100)}%`, backgroundColor: medal }}
          />
        </View>
      )}
    </View>
  );
}
