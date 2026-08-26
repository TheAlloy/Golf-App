import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { coursePoints, repeatPlayPoints } from '@/lib/points';
import { useAppStore } from '@/store/use-app-store';

export default function CourseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const course = useAppStore((s) => s.courses.find((c) => c.id === id));
  const rounds = useAppStore((s) => s.rounds).filter((r) => r.courseId === id);
  const friends = useAppStore((s) => s.friends);

  if (!course) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={{ padding: Spacing.three }}>Course not found.</ThemedText>
      </ThemedView>
    );
  }

  const friendName = (fid: string) => friends.find((f) => f.id === fid)?.name ?? 'Unknown';
  const bestScore = rounds.reduce<number | undefined>(
    (best, r) => (r.score !== undefined && (best === undefined || r.score < best) ? r.score : best),
    undefined
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: course.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{course.name}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {[course.city, course.country].filter(Boolean).join(', ')}
        </ThemedText>

        <View style={styles.statsRow}>
          <Stat label="Par" value={String(course.par)} />
          <Stat label="Holes" value={String(course.holes)} />
          <Stat label="Times played" value={String(rounds.length)} />
          <Stat label="Best" value={bestScore !== undefined ? String(bestScore) : '—'} />
        </View>

        <View style={styles.pointsCard}>
          <ThemedText type="smallBold" style={styles.pointsText}>
            {rounds.length === 0
              ? `Worth ${coursePoints(course)} rarity points — only ~${course.popularity}% of golfers have played here`
              : `Earned ${coursePoints(course)} pts here · +${repeatPlayPoints(course)} per repeat round`}
          </ThemedText>
        </View>

        <Pressable
          style={styles.logButton}
          onPress={() => router.push({ pathname: '/log-round', params: { courseId: course.id } })}
        >
          <ThemedText type="smallBold" style={styles.logButtonText}>+ Log a round here</ThemedText>
        </Pressable>

        <ThemedText type="smallBold" style={styles.sectionTitle}>Rounds</ThemedText>
        {rounds.length === 0 && (
          <ThemedText type="small" themeColor="textSecondary">No rounds logged yet.</ThemedText>
        )}
        {rounds.map((r) => (
          <View key={r.id} style={styles.roundRow}>
            <ThemedText>
              {r.date} · {r.holesPlayed} holes
              {r.score !== undefined ? ` · ${r.score} (${r.toPar! >= 0 ? '+' : ''}${r.toPar})` : ''}
            </ThemedText>
            {r.playedWith.length > 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                With {r.playedWith.map(friendName).join(', ')}
              </ThemedText>
            )}
            {(r.occasion || r.tags.length > 0) && (
              <ThemedText type="small" themeColor="textSecondary">
                {[r.occasion, ...r.tags.map((t) => `#${t}`)].filter(Boolean).join(' · ')}
              </ThemedText>
            )}
          </View>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="smallBold">{value}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  statsRow: { flexDirection: 'row', gap: Spacing.four, marginVertical: Spacing.two },
  stat: { alignItems: 'center' },
  pointsCard: { backgroundColor: '#2E7D32', borderRadius: 12, padding: Spacing.three },
  pointsText: { color: '#fff' },
  logButton: {
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  logButtonText: { color: '#2E7D32' },
  sectionTitle: { marginTop: Spacing.three },
  roundRow: { paddingVertical: Spacing.two, gap: 2 },
});
