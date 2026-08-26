import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CourseMap from '@/components/course-map';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
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
    <View className="flex-1 bg-background">
      <CourseMap courses={courses} playedCourseIds={playedIds} />

      <View
        className="absolute self-center items-center rounded-xl bg-foreground/90 px-4 py-2"
        style={{ top: insets.top + 8 }}
      >
        <Text className="font-medium text-sm text-background">
          ⛳ {playedIds.size}/{courses.length} courses · {points} pts
        </Text>
        <Text className="text-xs text-background/70">Long-press the map to add a course</Text>
      </View>

      <Button
        className="absolute right-4 shadow-lg"
        style={{ bottom: insets.bottom + 24 }}
        onPress={() => router.push('/log-round')}
      >
        <Text>+ Log round</Text>
      </Button>
    </View>
  );
}
