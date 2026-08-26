import { useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
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
    <ScrollView contentContainerClassName="gap-2 p-4">
      <Text className="mb-2 text-sm text-muted-foreground">
        The interactive map is available in the iOS/Android app. Course list shown on web:
      </Text>
      {sorted.map((course) => (
        <Pressable
          key={course.id}
          className="flex-row items-center justify-between py-2"
          onPress={() => router.push({ pathname: '/course/[id]', params: { id: course.id } })}
        >
          <View className="mr-2 flex-1">
            <Text>{course.name}</Text>
            <Text className="text-sm text-muted-foreground">
              {[course.city, course.country].filter(Boolean).join(', ')}
            </Text>
          </View>
          <Text
            className={
              playedCourseIds.has(course.id)
                ? 'font-semibold text-sm text-primary'
                : 'font-semibold text-sm text-muted-foreground'
            }
          >
            {playedCourseIds.has(course.id) ? 'Played ✓' : '—'}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
