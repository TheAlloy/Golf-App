import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CourseCard } from '@/components/course-card';
import { useTabBarSpace } from '@/components/tab-bar';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import {
  browseCatalogue,
  EXPLORE_REGIONS,
  ExploreRegion,
  regionCount,
  searchCatalogue,
} from '@/data/course-catalogue';
import { cn } from '@/lib/cn';
import { wishReward } from '@/lib/progression';
import { wishlistProgress } from '@/lib/wishlist';
import { Course } from '@/models/types';
import { usePlayedCourseIds, usePlayerData } from '@/store/use-app-store';

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const { rounds, wishlist, courses } = usePlayerData();
  const playedIds = usePlayedCourseIds();

  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<ExploreRegion>('featured');

  const results = useMemo(
    () => (query.trim() ? searchCatalogue(query, 40) : browseCatalogue(region, 40)),
    [query, region]
  );

  const entries = useMemo(() => wishlistProgress(wishlist, rounds), [rounds, wishlist]);
  const completed = new Set(entries.filter((e) => e.completedRound).map((e) => e.courseId));
  const wished = entries
    .map((e) => courses.get(e.courseId))
    .filter((c): c is Course => c !== undefined);

  const header = (
    <View className="gap-4 pb-2">
      <View>
        <Text className="font-bold text-2xl text-foreground">Explore</Text>
        <Text className="text-xs text-muted-foreground">
          Find courses to chase. Wishlisted courses score double when you play them.
        </Text>
      </View>

      <View className="flex-row items-center gap-2 rounded-lg border border-border bg-card pl-3">
        <Ionicons name="search" size={16} color={colors.mutedForeground} />
        <Input
          className="flex-1 border-0 bg-transparent"
          placeholder="Search courses or towns"
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
        />
        {query !== '' && (
          <Pressable
            className="px-3"
            onPress={() => setQuery('')}
            accessibilityLabel="Clear search"
          >
            <Ionicons name="close-circle" size={16} color={colors.mutedForeground} />
          </Pressable>
        )}
      </View>

      {/* Wishlist strip */}
      {!query && (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="heart" size={14} color={colors.destructive} />
              <Text className="font-semibold text-base">Your wishlist</Text>
            </View>
            <Text className="text-xs text-muted-foreground">
              {completed.size} / {wished.length} played
            </Text>
          </View>
          {wished.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border p-4">
              <Text className="text-sm text-muted-foreground">
                Tap the heart on any course below to start your wishlist.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {wished.map((c) => (
                  <WishCard
                    key={c.id}
                    course={c}
                    done={completed.has(c.id)}
                    played={playedIds.has(c.id)}
                    onPress={() => router.push({ pathname: '/course/[id]', params: { id: c.id } })}
                  />
                ))}
              </View>
            </ScrollView>
          )}
        </View>
      )}

      {/* Region chips */}
      {!query && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {EXPLORE_REGIONS.map((r) => (
              <Pressable
                key={r.id}
                className={cn(
                  'rounded-full border px-4 py-1.5',
                  region === r.id ? 'border-primary bg-primary' : 'border-border bg-card'
                )}
                onPress={() => setRegion(r.id)}
              >
                <Text
                  className={cn(
                    'font-medium text-sm',
                    region === r.id ? 'text-primary-foreground' : 'text-foreground'
                  )}
                >
                  {r.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}

      <Text className="text-xs text-muted-foreground">
        {query
          ? `${results.length === 40 ? 'Top 40' : results.length} match${results.length === 1 ? '' : 'es'}`
          : region === 'featured'
            ? 'The courses golfers travel for'
            : `${regionCount(region).toLocaleString()} courses · rarest first, so the most points are at the top`}
      </Text>
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <FlatList
        indicatorStyle="white"
        data={results}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: tabSpace + 24,
          gap: 8,
        }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <CourseCard
            course={item}
            played={playedIds.has(item.id)}
            completed={completed.has(item.id)}
          />
        )}
        ListEmptyComponent={
          <Text className="py-8 text-center text-sm text-muted-foreground">
            No courses match “{query}”.
          </Text>
        }
      />
    </View>
  );
}

function WishCard({
  course,
  done,
  played,
  onPress,
}: {
  course: Course;
  done: boolean;
  played: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={cn(
        'w-40 justify-between rounded-xl p-3 active:opacity-80',
        done ? 'bg-primary-bright/15' : 'bg-card'
      )}
      style={{ minHeight: 112 }}
      onPress={onPress}
    >
      <View>
        <Text className="font-semibold text-sm text-foreground" numberOfLines={2}>
          {course.name}
        </Text>
        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
          {course.country}
        </Text>
      </View>
      {done ? (
        <View className="flex-row items-center gap-1">
          <Ionicons name="checkmark-circle" size={14} color={colors.primaryBright} />
          <Text className="font-semibold text-xs text-primary-bright">Ticked off</Text>
        </View>
      ) : (
        <View className="flex-row items-center gap-1">
          <Ionicons name="sparkles" size={12} color={colors.warm} />
          <Text className="font-semibold text-xs" style={{ color: colors.warm }}>
            {wishReward(course, played)} pts to claim
          </Text>
        </View>
      )}
    </Pressable>
  );
}
