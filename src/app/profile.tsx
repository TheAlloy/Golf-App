import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { CATALOGUE_COUNT } from '@/data/course-catalogue';
import { calculateHandicap, formatHandicap, HANDICAP_MIN_ROUNDS } from '@/lib/handicap';
import { coursePoints, totalPoints } from '@/lib/points';
import { isBackendConfigured } from '@/lib/supabase';
import { useAppStore, useCourses, usePlayedCourseIds } from '@/store/use-app-store';

export default function ProfileScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const rounds = useAppStore((s) => s.rounds);
  const playedIds = usePlayedCourseIds();
  const courses = useCourses(rounds.map((r) => r.courseId));

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);

  const handicap = useMemo(() => calculateHandicap(rounds, courses), [courses, rounds]);
  const points = totalPoints(rounds, courses);
  const played = [...playedIds].map((id) => courses.get(id)).filter((c) => c !== undefined);
  const countries = new Set(played.map((c) => c.country).filter(Boolean));
  const rarest = [...played].sort((a, b) => a.popularity - b.popularity)[0];

  const saveProfile = () => {
    updateProfile({ name: name.trim() || 'Golfer' });
    setEditing(false);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 p-4">
        {editing ? (
          <View className="gap-2">
            <Input value={name} onChangeText={setName} placeholder="Your name" />
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
              <Text className="text-sm text-muted-foreground">Tap to edit</Text>
            </View>
          </Pressable>
        )}

        {/* Handicap is derived from logged rounds, never typed in. */}
        <View className="items-center rounded-xl bg-card p-6">
          <Text className="font-bold text-6xl text-primary">
            {formatHandicap(handicap.index)}
          </Text>
          <Text className="font-semibold text-sm text-foreground">Handicap index</Text>
          <Text className="mt-1 text-center text-xs text-muted-foreground">
            {handicap.index === null
              ? `${handicap.roundsNeeded} more round${handicap.roundsNeeded === 1 ? '' : 's'} needed — it appears after ${HANDICAP_MIN_ROUNDS}`
              : `Best ${handicap.usedRounds} of your last ${Math.min(rounds.length, 20)} rounds`}
          </Text>
        </View>

        <View className="rounded-xl bg-card p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="information-circle" size={16} color={colors.info} />
            <Text className="font-semibold text-sm">How this is worked out</Text>
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">
            The World Handicap System averages the best 8 of your last 20 rounds against each
            course&apos;s rating and slope. Those ratings are licensed data the app does not have
            yet, so this uses your score against par instead. Treat it as a good estimate rather
            than an official index.
          </Text>
        </View>

        <View className="flex-row gap-2">
          <StatTile label="Courses" value={String(playedIds.size)} />
          <StatTile label="Rounds" value={String(rounds.length)} />
          <StatTile label="Countries" value={String(countries.size)} />
        </View>

        <View className="rounded-xl bg-card p-4">
          <View className="flex-row items-center gap-2">
            <Ionicons name="sparkles" size={16} color={colors.warm} />
            <Text className="font-semibold">Rarity points</Text>
            <Text className="ml-auto font-bold text-lg text-primary">{points}</Text>
          </View>
          {rarest ? (
            <Text className="mt-1 text-xs text-muted-foreground">
              Rarest tick: {rarest.name} — about {rarest.popularity}% of golfers have played it,
              worth {coursePoints(rarest)} pts
            </Text>
          ) : (
            <Text className="mt-1 text-xs text-muted-foreground">
              Play somewhere few people have and watch this climb.
            </Text>
          )}
        </View>

        <Pressable className="rounded-xl bg-card p-4" onPress={() => router.push('/coverage')}>
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-sm">Course coverage</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
          </View>
          <Text className="mt-1 text-xs text-muted-foreground">
            {CATALOGUE_COUNT.toLocaleString()} courses bundled. US data from the OpenGolfAPI open
            dataset, licensed ODbL.
          </Text>
          <Text className="mt-2 text-xs text-muted-foreground">
            {isBackendConfigured
              ? 'Connected to backend.'
              : 'Running local-only — your rounds live on this device until the backend is connected.'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
