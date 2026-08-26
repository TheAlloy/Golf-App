import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { isBackendConfigured } from '@/lib/supabase';
import { coursePoints, totalPoints } from '@/lib/points';
import { useAppStore, useCoursesById, usePlayedCourseIds } from '@/store/use-app-store';

export default function ProfileScreen() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const rounds = useAppStore((s) => s.rounds);
  const playedIds = usePlayedCourseIds();
  const coursesById = useCoursesById();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(profile.name);
  const [handicap, setHandicap] = useState(profile.handicap?.toString() ?? '');

  const points = totalPoints(rounds, coursesById);
  const playedCourses = [...playedIds].map((id) => coursesById.get(id)).filter((c) => c !== undefined);
  const countries = new Set(playedCourses.map((c) => c.country).filter(Boolean));
  const rarest = playedCourses.sort((a, b) => a.popularity - b.popularity)[0];

  const saveProfile = () => {
    updateProfile({ name: name.trim() || 'Golfer', handicap: handicap ? Number(handicap) : undefined });
    setEditing(false);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 p-4">
        {editing ? (
          <View className="gap-2">
            <TextInput
              className="rounded-lg bg-muted px-4 py-3 text-base text-foreground"
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderClassName="text-muted-foreground"
            />
            <TextInput
              className="rounded-lg bg-muted px-4 py-3 text-base text-foreground"
              value={handicap}
              onChangeText={setHandicap}
              keyboardType="numeric"
              placeholder="Handicap (optional)"
              placeholderClassName="text-muted-foreground"
            />
            <Button onPress={saveProfile}>
              <Text>Save</Text>
            </Button>
          </View>
        ) : (
          <Button variant="ghost" className="h-auto items-start justify-start px-0" onPress={() => setEditing(true)}>
            <View className="gap-1">
              <Text className="text-3xl font-semibold text-foreground">{profile.name}</Text>
              <Text className="text-sm text-muted-foreground">
                {profile.handicap !== undefined ? `Handicap ${profile.handicap} · ` : ''}Tap to edit
              </Text>
            </View>
          </Button>
        )}

        <Card className="items-center border-0 bg-primary py-8">
          <Text className="text-6xl font-semibold text-primary-foreground">{points}</Text>
          <Text className="text-sm font-medium text-primary-foreground opacity-80">rarity points</Text>
        </Card>

        <View className="flex-row justify-around">
          <Stat label="Courses played" value={String(playedIds.size)} />
          <Stat label="Rounds logged" value={String(rounds.length)} />
          <Stat label="Countries" value={String(countries.size)} />
        </View>

        {rarest && (
          <Card>
            <CardContent className="gap-1 pt-4">
              <Text className="font-semibold">Rarest tick: {rarest.name}</Text>
              <Text className="text-sm text-muted-foreground">
                Only ~{rarest.popularity}% of golfers have played it — worth {coursePoints(rarest)} pts
              </Text>
            </CardContent>
          </Card>
        )}

        <Text className="text-center text-sm text-muted-foreground">
          {isBackendConfigured
            ? 'Connected to backend.'
            : 'Running local-only. Data lives on this device until the Supabase backend is connected (see supabase/ in the repo).'}
        </Text>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center gap-1">
      <Text className="text-3xl font-semibold text-foreground">{value}</Text>
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}
