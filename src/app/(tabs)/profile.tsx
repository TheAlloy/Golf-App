import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isBackendConfigured } from '@/lib/supabase';
import { coursePoints, totalPoints } from '@/lib/points';
import { useAppStore, useCoursesById, usePlayedCourseIds } from '@/store/use-app-store';

export default function ProfileScreen() {
  const theme = useTheme();
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
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {editing ? (
          <View style={styles.editForm}>
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.textSecondary}
            />
            <TextInput
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              value={handicap}
              onChangeText={setHandicap}
              keyboardType="numeric"
              placeholder="Handicap (optional)"
              placeholderTextColor={theme.textSecondary}
            />
            <Pressable style={styles.saveButton} onPress={saveProfile}>
              <ThemedText type="smallBold" style={styles.saveButtonText}>Save</ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={() => setEditing(true)}>
            <ThemedText type="subtitle">{profile.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {profile.handicap !== undefined ? `Handicap ${profile.handicap} · ` : ''}Tap to edit
            </ThemedText>
          </Pressable>
        )}

        <View style={styles.pointsCard}>
          <ThemedText type="title" style={styles.pointsValue}>{points}</ThemedText>
          <ThemedText type="smallBold" style={styles.pointsLabel}>rarity points</ThemedText>
        </View>

        <View style={styles.statsGrid}>
          <Stat label="Courses played" value={String(playedIds.size)} />
          <Stat label="Rounds logged" value={String(rounds.length)} />
          <Stat label="Countries" value={String(countries.size)} />
        </View>

        {rarest && (
          <View style={styles.rareCard}>
            <ThemedText type="smallBold">Rarest tick: {rarest.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Only ~{rarest.popularity}% of golfers have played it — worth {coursePoints(rarest)} pts
            </ThemedText>
          </View>
        )}

        <ThemedText type="small" themeColor="textSecondary" style={styles.backendNote}>
          {isBackendConfigured
            ? 'Connected to backend.'
            : 'Running local-only. Data lives on this device until the Supabase backend is connected (see supabase/ in the repo).'}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="subtitle">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  editForm: { gap: Spacing.two },
  input: { borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, fontSize: 16 },
  saveButton: { backgroundColor: '#2E7D32', borderRadius: 10, alignItems: 'center', paddingVertical: Spacing.two + 2 },
  saveButtonText: { color: '#fff' },
  pointsCard: { backgroundColor: '#2E7D32', borderRadius: 16, alignItems: 'center', padding: Spacing.four },
  pointsValue: { color: '#fff' },
  pointsLabel: { color: '#C8E6C9' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  rareCard: { borderWidth: 1, borderColor: '#2E7D32', borderRadius: 12, padding: Spacing.three, gap: 2 },
  backendNote: { textAlign: 'center', marginTop: Spacing.two },
});
