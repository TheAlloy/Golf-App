import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Globe from '@/components/globe';
import { formatToPar, ScoreBadge } from '@/components/ui/score-badge';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/constants/theme';
import { CATALOGUE_COUNT } from '@/data/course-catalogue';
import { cn } from '@/lib/cn';
import { totalPoints } from '@/lib/points';
import { Continent } from '@/models/types';
import { useAppStore, useCourses, usePlayedCourseIds } from '@/store/use-app-store';

export default function HomeScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const rounds = useAppStore((s) => s.rounds);
  const profile = useAppStore((s) => s.profile);
  const playedIds = usePlayedCourseIds();
  const courses = useCourses(rounds.map((r) => r.courseId));
  const [view, setView] = useState<'map' | 'list'>('map');

  const playedPoints = useMemo(
    () => [...playedIds].map((id) => courses.get(id)?.coordinate).filter((c) => c !== undefined),
    [courses, playedIds]
  );

  const continentCounts = useMemo(() => {
    const counts: Partial<Record<Continent, number>> = {};
    for (const id of playedIds) {
      const c = courses.get(id);
      if (c) counts[c.continent] = (counts[c.continent] ?? 0) + 1;
    }
    return counts;
  }, [courses, playedIds]);

  const scored = rounds.filter((r) => r.score !== undefined);
  const averageScore = scored.length
    ? (scored.reduce((sum, r) => sum + (r.score ?? 0), 0) / scored.length).toFixed(1)
    : '—';
  const points = totalPoints(rounds, courses);
  const globeSize = Math.min(width - 32, 360);

  const recent = [...rounds].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 24 }}
        contentContainerClassName="gap-4"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4">
          <Pressable className="h-10 w-10 items-center justify-center rounded-full bg-card">
            <Ionicons name="funnel" size={18} color={colors.foreground} />
          </Pressable>
          <View className="items-center">
            <Text className="font-bold text-xl text-foreground">Global Play</Text>
            <Text className="text-xs text-muted-foreground">Your golf journey around the world</Text>
          </View>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-card"
            onPress={() => router.push('/log-round')}
          >
            <Ionicons name="add" size={22} color={colors.foreground} />
          </Pressable>
        </View>

        {/* Map / List toggle */}
        <View className="mx-4 flex-row rounded-xl bg-card p-1">
          {(['map', 'list'] as const).map((v) => (
            <Pressable
              key={v}
              className={cn(
                'flex-1 items-center rounded-lg py-2',
                view === v ? 'bg-elevated' : 'bg-transparent'
              )}
              onPress={() => setView(v)}
            >
              <Text
                className={cn(
                  'font-semibold text-sm',
                  view === v ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {v === 'map' ? 'Map' : 'List'}
              </Text>
            </Pressable>
          ))}
        </View>

        {view === 'map' ? (
          <View className="items-center">
            <Globe
              size={globeSize}
              playedPoints={playedPoints}
              continentCounts={continentCounts}
            />
            <View className="mt-2 flex-row items-center gap-2 rounded-lg bg-card px-3 py-2">
              <Text className="text-xs text-muted-foreground">Courses worldwide</Text>
              <Text className="font-bold text-xs text-primary">
                {CATALOGUE_COUNT.toLocaleString()}
              </Text>
              <Text className="text-xs text-muted-foreground">· drag to spin</Text>
            </View>
          </View>
        ) : (
          <View className="mx-4 gap-2">
            {playedIds.size === 0 ? (
              <Text className="text-muted-foreground">
                No courses played yet. Log a round and it lights up on the globe.
              </Text>
            ) : (
              [...playedIds].map((id) => {
                const c = courses.get(id);
                if (!c) return null;
                return (
                  <Pressable
                    key={id}
                    className="flex-row items-center justify-between rounded-xl bg-card p-3"
                    onPress={() => router.push({ pathname: '/course/[id]', params: { id } })}
                  >
                    <View className="flex-1">
                      <Text className="font-semibold">{c.name}</Text>
                      <Text className="text-xs text-muted-foreground">
                        {[c.city, c.region || c.country].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* Stat tiles */}
        <View className="mx-4 flex-row gap-2">
          <StatTile
            label="Courses Played"
            value={String(playedIds.size)}
            icon={<Ionicons name="flag" size={14} color={colors.primary} />}
          />
          <StatTile
            label="Average Score"
            value={averageScore}
            icon={<Ionicons name="pulse" size={14} color={colors.info} />}
          />
          <StatTile
            label="Rarity Points"
            value={String(points)}
            icon={<Ionicons name="sparkles" size={14} color={colors.warm} />}
          />
        </View>

        {/* Recent rounds */}
        <View className="mx-4 rounded-xl bg-card p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-base">Recent Rounds</Text>
            <Pressable onPress={() => router.push('/rounds')}>
              <Text className="text-sm text-primary">View All</Text>
            </Pressable>
          </View>

          {recent.length === 0 ? (
            <Text className="mt-3 text-sm text-muted-foreground">
              Nothing logged yet. Tap Play to add your first round.
            </Text>
          ) : (
            <View className="mt-2">
              {recent.map((r) => {
                const c = courses.get(r.courseId);
                return (
                  <Pressable
                    key={r.id}
                    className="flex-row items-center gap-3 border-b border-border py-3"
                    onPress={() => router.push({ pathname: '/round/[id]', params: { id: r.id } })}
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-lg bg-elevated">
                      <Ionicons name="golf-outline" size={20} color={colors.mutedForeground} />
                    </View>
                    <View className="flex-1">
                      <Text className="font-semibold text-sm">{c?.name ?? 'Unknown course'}</Text>
                      <Text className="text-xs text-muted-foreground">
                        {[c?.city, c?.region || c?.country].filter(Boolean).join(', ')}
                      </Text>
                      <Text className="text-xs text-muted-foreground">{r.date}</Text>
                    </View>
                    <View className="flex-row items-baseline gap-2">
                      <Text className="font-bold text-xl text-foreground">{r.score ?? '—'}</Text>
                      <ScoreBadge toPar={r.toPar} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {profile.handicap !== undefined && (
          <Text className="text-center text-xs text-muted-foreground">
            Playing off {profile.handicap} · best round {formatToPar(
              scored.reduce<number | undefined>(
                (best, r) => (best === undefined || (r.toPar ?? 99) < best ? r.toPar : best),
                undefined
              )
            )}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
