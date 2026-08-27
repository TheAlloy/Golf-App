import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/constants/theme';
import { CATALOGUE_COUNT } from '@/data/course-catalogue';
import { isBackendConfigured } from '@/lib/supabase';
import { coursePoints, totalPoints } from '@/lib/points';
import { useAppStore, useCourses, usePlayedCourseIds } from '@/store/use-app-store';

export default function ProfileScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const rounds = useAppStore((s) => s.rounds);
  const friends = useAppStore((s) => s.friends);
  const playedIds = usePlayedCourseIds();
  const courses = useCourses(rounds.map((r) => r.courseId));

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [handicap, setHandicap] = useState(profile.handicap?.toString() ?? '');

  const points = totalPoints(rounds, courses);
  const played = [...playedIds].map((id) => courses.get(id)).filter((c) => c !== undefined);
  const countries = new Set(played.map((c) => c.country).filter(Boolean));
  const rarest = [...played].sort((a, b) => a.popularity - b.popularity)[0];

  const saveProfile = () => {
    updateProfile({ name: name.trim() || 'Golfer', handicap: handicap ? Number(handicap) : undefined });
    setEditing(false);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 p-4 pt-16">
        {editing ? (
          <View className="gap-2">
            <Input value={name} onChangeText={setName} placeholder="Your name" />
            <Input
              value={handicap}
              onChangeText={setHandicap}
              keyboardType="numeric"
              placeholder="Handicap (optional)"
            />
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
                {profile.handicap !== undefined ? `Handicap ${profile.handicap} · ` : ''}Tap to edit
              </Text>
            </View>
          </Pressable>
        )}

        <View className="items-center rounded-xl bg-primary p-6">
          <Text className="font-bold text-5xl" style={{ color: colors.primaryForeground }}>
            {points}
          </Text>
          <Text className="font-semibold text-sm" style={{ color: colors.primaryForeground }}>
            rarity points
          </Text>
        </View>

        <View className="flex-row gap-2">
          <StatTile label="Courses" value={String(playedIds.size)} />
          <StatTile label="Rounds" value={String(rounds.length)} />
          <StatTile label="Countries" value={String(countries.size)} />
        </View>

        {rarest && (
          <View className="rounded-xl bg-card p-4">
            <View className="flex-row items-center gap-2">
              <Ionicons name="trophy" size={16} color={colors.warm} />
              <Text className="font-semibold">Rarest tick</Text>
            </View>
            <Text className="mt-1 text-sm">{rarest.name}</Text>
            <Text className="text-xs text-muted-foreground">
              ~{rarest.popularity}% of golfers have played it — worth {coursePoints(rarest)} pts
            </Text>
          </View>
        )}

        <Pressable
          className="flex-row items-center justify-between rounded-xl bg-card p-4"
          onPress={() => router.push('/friends')}
        >
          <View className="flex-row items-center gap-2">
            <Ionicons name="people" size={18} color={colors.foreground} />
            <Text className="font-semibold">Friends</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Text className="text-sm text-muted-foreground">{friends.length}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
          </View>
        </Pressable>

        <View className="rounded-xl bg-card p-4">
          <Text className="font-semibold text-sm">Course data</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            {CATALOGUE_COUNT.toLocaleString()} courses bundled. US data from the OpenGolfAPI open
            dataset, licensed ODbL.
          </Text>
          <Text className="mt-2 text-xs text-muted-foreground">
            {isBackendConfigured
              ? 'Connected to backend.'
              : 'Running local-only — your rounds live on this device until the Supabase backend is connected.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
