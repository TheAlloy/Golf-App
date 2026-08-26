import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
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
      <View className="flex-1 bg-background p-4">
        <Text>Course not found.</Text>
      </View>
    );
  }

  const friendName = (fid: string) => friends.find((f) => f.id === fid)?.name ?? 'Unknown';
  const bestScore = rounds.reduce<number | undefined>(
    (best, r) => (r.score !== undefined && (best === undefined || r.score < best) ? r.score : best),
    undefined
  );

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: course.name }} />
      <ScrollView contentContainerClassName="gap-2 p-4">
        <Text className="text-3xl font-semibold text-foreground">{course.name}</Text>
        <Text className="text-muted-foreground">
          {[course.city, course.country].filter(Boolean).join(', ')}
        </Text>

        <View className="my-2 flex-row gap-6">
          <Stat label="Par" value={String(course.par)} />
          <Stat label="Holes" value={String(course.holes)} />
          <Stat label="Times played" value={String(rounds.length)} />
          <Stat label="Best" value={bestScore !== undefined ? String(bestScore) : '—'} />
        </View>

        <Card className="border-0 bg-primary">
          <CardContent className="pt-4">
            <Text className="font-medium text-sm text-primary-foreground">
              {rounds.length === 0
                ? `Worth ${coursePoints(course)} rarity points — only ~${course.popularity}% of golfers have played here`
                : `Earned ${coursePoints(course)} pts here · +${repeatPlayPoints(course)} per repeat round`}
            </Text>
          </CardContent>
        </Card>

        <Button
          variant="outline"
          onPress={() => router.push({ pathname: '/log-round', params: { courseId: course.id } })}
        >
          <Text>+ Log a round here</Text>
        </Button>

        <Text className="mt-4 font-semibold text-sm">Rounds</Text>
        {rounds.length === 0 && (
          <Text className="text-sm text-muted-foreground">No rounds logged yet.</Text>
        )}
        {rounds.map((r) => (
          <View key={r.id} className="gap-0.5 py-2">
            <Text>
              {r.date} · {r.holesPlayed} holes
              {r.score !== undefined ? ` · ${r.score} (${r.toPar! >= 0 ? '+' : ''}${r.toPar})` : ''}
            </Text>
            {r.playedWith.length > 0 && (
              <Text className="text-sm text-muted-foreground">
                With {r.playedWith.map(friendName).join(', ')}
              </Text>
            )}
            {(r.occasion || r.tags.length > 0) && (
              <Text className="text-sm text-muted-foreground">
                {[r.occasion, ...r.tags.map((t) => `#${t}`)].filter(Boolean).join(' · ')}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="font-semibold text-sm">{value}</Text>
      <Text className="text-sm text-muted-foreground">{label}</Text>
    </View>
  );
}
