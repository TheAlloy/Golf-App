import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ScoreBadge } from '@/components/ui/score-badge';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { computeAchievements } from '@/lib/achievements';
import { cn } from '@/lib/cn';
import { aggregateStats } from '@/lib/stats';
import { useAppStore, useCourses } from '@/store/use-app-store';

export default function StatsScreen() {
  const router = useRouter();
  const rounds = useAppStore((s) => s.rounds);
  const friends = useAppStore((s) => s.friends);
  const courses = useCourses(rounds.map((r) => r.courseId));

  const parsByCourse = useMemo(() => {
    const map = new Map<string, number[] | undefined>();
    for (const [id, course] of courses) map.set(id, course.holePars);
    return map;
  }, [courses]);

  const stats = aggregateStats(rounds, parsByCourse);
  const achievements = useMemo(() => computeAchievements(rounds, courses), [courses, rounds]);
  const earned = achievements.filter((a) => a.earned);

  const scored = rounds.filter((r) => r.score !== undefined);
  const best = scored.reduce<(typeof scored)[number] | undefined>(
    (b, r) => (b === undefined || (r.toPar ?? 99) < (b.toPar ?? 99) ? r : b),
    undefined
  );
  const pct = (hit: number, chances: number) =>
    chances ? `${Math.round((hit / chances) * 100)}%` : '—';

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 p-4">
        <View className="flex-row gap-2">
          <StatTile label="Rounds" value={String(rounds.length)} />
          <StatTile
            label="Avg score"
            value={
              scored.length
                ? (scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length).toFixed(1)
                : '—'
            }
          />
          <StatTile label="Best" value={best?.score !== undefined ? String(best.score) : '—'} />
        </View>

        {/* Shot quality */}
        <View className="rounded-xl bg-card p-4">
          <Text className="font-semibold text-base">Shot quality</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            From rounds logged hole by hole. Greens in regulation are worked out from your score,
            putts and the hole&apos;s par.
          </Text>
          <View className="mt-3 flex-row gap-2">
            <StatTile
              className="bg-elevated"
              label="Fairways"
              value={pct(stats.fairwaysHit, stats.fairwayChances)}
              delta={`${stats.fairwaysHit} / ${stats.fairwayChances}`}
              icon={<Ionicons name="golf-outline" size={14} color={colors.primary} />}
            />
            <StatTile
              className="bg-elevated"
              label="GIR"
              value={pct(stats.greensInRegulation, stats.girChances)}
              delta={`${stats.greensInRegulation} / ${stats.girChances}`}
              icon={<Ionicons name="disc-outline" size={14} color={colors.info} />}
            />
            <StatTile
              className="bg-elevated"
              label="Putts"
              value={stats.holesWithPutts ? (stats.putts / stats.holesWithPutts).toFixed(2) : '—'}
              delta="per hole"
              icon={<Ionicons name="ellipse-outline" size={14} color={colors.warm} />}
            />
          </View>
          {stats.holesWithPutts === 0 && (
            <Text className="mt-3 text-sm text-muted-foreground">
              Log a round hole by hole to fill these in.
            </Text>
          )}
        </View>

        {/* Achievements */}
        <View className="rounded-xl bg-card p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-base">Achievements</Text>
            <Text className="text-sm text-muted-foreground">
              {earned.length} / {achievements.length}
            </Text>
          </View>
          <View className="mt-3 gap-2">
            {achievements.map((a) => (
              <View
                key={a.id}
                className={cn(
                  'flex-row items-center gap-3 rounded-lg p-3',
                  a.earned ? 'bg-primary/15' : 'bg-elevated'
                )}
              >
                <View
                  className={cn(
                    'h-9 w-9 items-center justify-center rounded-full',
                    a.earned ? 'bg-primary' : 'bg-card'
                  )}
                >
                  <Ionicons
                    name={a.icon as keyof typeof Ionicons.glyphMap}
                    size={16}
                    color={a.earned ? colors.primaryForeground : colors.mutedForeground}
                  />
                </View>
                <View className="flex-1">
                  <Text className={cn('font-semibold text-sm', !a.earned && 'text-muted-foreground')}>
                    {a.name}
                  </Text>
                  <Text className="text-xs text-muted-foreground">{a.description}</Text>
                  {!a.earned && (
                    <View className="mt-1.5 h-1 overflow-hidden rounded-full bg-card">
                      <View
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(2, a.progress * 100)}%` }}
                      />
                    </View>
                  )}
                </View>
                <Text className="text-xs text-muted-foreground">{a.detail}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Friends */}
        <Pressable className="rounded-xl bg-card p-4" onPress={() => router.push('/friends')}>
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-base">Friends</Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-sm text-muted-foreground">{friends.length}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
            </View>
          </View>
          {friends.length === 0 ? (
            <Text className="mt-1 text-xs text-muted-foreground">
              Add the people you play with, then tag them on a round.
            </Text>
          ) : (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {friends.slice(0, 8).map((f) => (
                <View
                  key={f.id}
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{ backgroundColor: f.avatarColor }}
                >
                  <Text className="font-bold text-xs" style={{ color: colors.primaryForeground }}>
                    {f.name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* Best rounds */}
        <View className="rounded-xl bg-card p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-base">Best rounds</Text>
            <Pressable onPress={() => router.push('/rounds')}>
              <Text className="text-sm text-primary">All rounds</Text>
            </Pressable>
          </View>
          {scored.length === 0 ? (
            <Text className="mt-2 text-sm text-muted-foreground">Nothing scored yet.</Text>
          ) : (
            [...scored]
              .sort((a, b) => (a.toPar ?? 99) - (b.toPar ?? 99))
              .slice(0, 5)
              .map((r) => (
                <Pressable
                  key={r.id}
                  className="flex-row items-center justify-between border-b border-border py-3"
                  onPress={() => router.push({ pathname: '/round/[id]', params: { id: r.id } })}
                >
                  <View className="flex-1">
                    <Text className="text-sm">{courses.get(r.courseId)?.name ?? 'Unknown course'}</Text>
                    <Text className="text-xs text-muted-foreground">{r.date}</Text>
                  </View>
                  <View className="flex-row items-baseline gap-2">
                    <Text className="font-bold text-lg text-foreground">{r.score}</Text>
                    <ScoreBadge toPar={r.toPar} />
                  </View>
                </Pressable>
              ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
