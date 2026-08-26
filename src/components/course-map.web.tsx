import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Course } from '@/models/types';

type Props = {
  courses: Course[];
  playedCourseIds: Set<string>;
};

/**
 * react-native-maps has no web implementation, so on web the map tab falls
 * back to a course list. The interactive map is a native-first feature.
 */
export default function CourseMap({ courses, playedCourseIds }: Props) {
  const router = useRouter();
  const sorted = [...courses].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        The interactive map is available in the iOS/Android app. Course list shown on web:
      </ThemedText>
      {sorted.map((course) => (
        <Pressable
          key={course.id}
          style={styles.row}
          onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        >
          <View style={styles.rowText}>
            <ThemedText>{course.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {[course.city, course.country].filter(Boolean).join(', ')}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={{ color: playedCourseIds.has(course.id) ? '#2E7D32' : '#9E9E9E' }}>
            {playedCourseIds.has(course.id) ? 'Played ✓' : '—'}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: Spacing.three, gap: Spacing.two },
  note: { marginBottom: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.two },
  rowText: { flex: 1, marginRight: Spacing.two },
});
