import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CourseMap from '@/components/course-map';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { totalPoints } from '@/lib/points';
import { useAppStore, useCoursesById, usePlayedCourseIds } from '@/store/use-app-store';

export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const courses = useAppStore((s) => s.courses);
  const rounds = useAppStore((s) => s.rounds);
  const playedIds = usePlayedCourseIds();
  const coursesById = useCoursesById();
  const points = totalPoints(rounds, coursesById);

  return (
    <View style={styles.container}>
      <CourseMap courses={courses} playedCourseIds={playedIds} />

      <View style={[styles.statsChip, { top: insets.top + Spacing.two }]}>
        <ThemedText type="smallBold" style={styles.chipText}>
          ⛳ {playedIds.size}/{courses.length} courses · {points} pts
        </ThemedText>
        <ThemedText type="small" style={styles.chipHint}>
          Long-press the map to add a course
        </ThemedText>
      </View>

      <Pressable
        style={[styles.fab, { bottom: insets.bottom + Spacing.four }]}
        onPress={() => router.push('/log-round')}
      >
        <ThemedText type="smallBold" style={styles.fabText}>+ Log round</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsChip: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(20, 40, 20, 0.85)',
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  chipText: { color: '#fff' },
  chipHint: { color: '#C8E6C9' },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    backgroundColor: '#2E7D32',
    borderRadius: 28,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: '#fff' },
});
