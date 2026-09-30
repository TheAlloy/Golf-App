import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarSpace } from '@/components/tab-bar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScoreBadge } from '@/components/ui/score-badge';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { CATALOGUE_COUNT } from '@/data/course-catalogue';
import { calculateHandicap, formatHandicap, HANDICAP_MIN_ROUNDS } from '@/lib/handicap';
import { computeProgression } from '@/lib/progression';
import { aggregateStats } from '@/lib/stats';
import { isBackendConfigured } from '@/lib/supabase';
import { useAppStore, usePlayedCourseIds, usePlayerData } from '@/store/use-app-store';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const friends = useAppStore((s) => s.friends);
  const { rounds, wishlist, courses } = usePlayerData();
  const playedIds = usePlayedCourseIds();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);

  const handicap = useMemo(() => calculateHandicap(rounds, courses), [courses, rounds]);
  const { level } = useMemo(
    () => computeProgression(rounds, courses, wishlist),
    [courses, rounds, wishlist]
  );
  const parsByCourse = useMemo(() => {
    const map = new Map<string, (number | undefined)[] | undefined>();
    for (const [id, course] of courses) map.set(id, course.holePars);
    return map;
  }, [courses]);
  const stats = aggregateStats(rounds, parsByCourse);

  const countries = new Set(
    [...playedIds].map((id) => courses.get(id)?.country).filter(Boolean)
  );
  const scored = rounds.filter((r) => r.score !== undefined);
  const recent = [...rounds].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  const pct = (hit: number, chances: number) =>
    chances ? `${Math.round((hit / chances) * 100)}%` : '—';

  const saveProfile = () => {
    updateProfile({ name: name.trim() || 'Golfer' });
    setEditing(false);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-4 px-4"
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: tabSpace + 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {editing ? (
          <View className="gap-2">
            <Input value={name} onChangeText={setName} placeholder="Your name" autoFocus />
            <Button onPress={saveProfile}>
              <Text>Save</Text>
            </Button>
          </View>
        ) : (
          <Pressable className="flex-row items-center gap-3" onPress={() => setEditing(true)}>
            <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
              <Text className="font-bold text-2xl" style={{ color: colors.primaryForeground }}>
                {profile.name.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-2xl text-foreground">{profile.name}</Text>
              <Text className="text-sm text-muted-foreground">
                Level {level.number} · {level.name}
              </Text>
            </View>
            <Ionicons name="create-outline" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}

        {/* Handicap is derived from logged rounds, never typed in. */}
        <View className="items-center rounded-2xl bg-card p-6">
          <Text className="font-bold text-6xl text-primary">{formatHandicap(handicap.index)}</Text>
          <Text className="font-semibold text-sm text-foreground">Handicap index</Text>
          <Text className="mt-1 text-center text-xs text-muted-foreground">
            {handicap.index === null
              ? `${handicap.roundsNeeded} more round${handicap.roundsNeeded === 1 ? '' : 's'} needed — it appears after ${HANDICAP_MIN_ROUNDS}`
              : `Best ${handicap.usedRounds} of your last ${Math.min(rounds.length, 20)} rounds`}
          </Text>
          <Text className="mt-3 text-center text-[11px] text-muted-foreground">
            World Handicap System method, using score against par in place of course rating and
            slope (licensed data the app doesn&apos;t have yet). A good estimate, not an official
            index.
          </Text>
        </View>

        <View className="flex-row gap-2">
          <StatTile label="Courses" value={String(playedIds.size)} />
          <StatTile label="Rounds" value={String(rounds.length)} />
          <StatTile label="Countries" value={String(countries.size)} />
        </View>

        {/* Shot quality */}
        <View className="rounded-2xl bg-card p-4">
          <Text className="font-semibold text-base">Shot quality</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            From rounds logged hole by hole. Greens in regulation are worked out from score, putts
            and par.
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
          {scored.length > 0 && (
            <Text className="mt-3 text-xs text-muted-foreground">
              Scoring average{' '}
              {(scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length).toFixed(1)} across{' '}
              {scored.length} round{scored.length === 1 ? '' : 's'}
            </Text>
          )}
        </View>

        {/* Recent rounds */}
        <View className="rounded-2xl bg-card p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-base">Recent rounds</Text>
            {rounds.length > 0 && (
              <Pressable onPress={() => router.push('/rounds')}>
                <Text className="text-sm text-primary">All {rounds.length}</Text>
              </Pressable>
            )}
          </View>
          {recent.length === 0 ? (
            <Text className="mt-2 text-sm text-muted-foreground">
              Nothing logged yet — tap + to add your first round.
            </Text>
          ) : (
            recent.map((r) => (
              <Pressable
                key={r.id}
                className="flex-row items-center justify-between border-b border-border py-3"
                onPress={() => router.push({ pathname: '/round/[id]', params: { id: r.id } })}
              >
                <View className="flex-1">
                  <Text className="text-sm" numberOfLines={1}>
                    {courses.get(r.courseId)?.name ?? 'Unknown course'}
                  </Text>
                  <Text className="text-xs text-muted-foreground">{r.date}</Text>
                </View>
                {r.score !== undefined && (
                  <View className="flex-row items-baseline gap-2">
                    <Text className="font-bold text-lg text-foreground">{r.score}</Text>
                    <ScoreBadge toPar={r.toPar} />
                  </View>
                )}
              </Pressable>
            ))
          )}
        </View>

        {/* Friends */}
        <Pressable className="rounded-2xl bg-card p-4" onPress={() => router.push('/friends')}>
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

        <Pressable className="rounded-2xl bg-card p-4" onPress={() => router.push('/coverage')}>
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-sm">Course coverage</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">
            {CATALOGUE_COUNT.toLocaleString()} courses bundled. US data from the OpenGolfAPI open
            dataset, licensed ODbL.{' '}
            {isBackendConfigured
              ? 'Connected to backend.'
              : 'Running local-only — rounds live on this device until the backend is connected.'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
