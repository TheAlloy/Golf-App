import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Round } from '@/models/types';
import { useAppStore, useCoursesById } from '@/store/use-app-store';

export default function RoundsScreen() {
  const router = useRouter();
  const rounds = useAppStore((s) => s.rounds);
  const friends = useAppStore((s) => s.friends);
  const coursesById = useCoursesById();

  const sorted = [...rounds].sort((a, b) => b.date.localeCompare(a.date));
  const friendName = (fid: string) => friends.find((f) => f.id === fid)?.name ?? 'Unknown';

  const renderRound = ({ item: r }: { item: Round }) => {
    const course = coursesById.get(r.courseId);
    return (
      <Pressable
        className="gap-1 border-b border-border py-4"
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: r.courseId } })}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-semibold">{course?.name ?? 'Unknown course'}</Text>
          <Text className="text-sm text-muted-foreground">{r.date}</Text>
        </View>
        <Text className="text-sm text-muted-foreground">
          {r.holesPlayed} holes
          {r.score !== undefined ? ` · ${r.score} (${r.toPar! >= 0 ? '+' : ''}${r.toPar})` : ''}
          {r.playedWith.length > 0 ? ` · with ${r.playedWith.map(friendName).join(', ')}` : ''}
        </Text>
        {(r.occasion || r.tags.length > 0) && (
          <Text className="text-sm text-muted-foreground">
            {[r.occasion, ...r.tags.map((t) => `#${t}`)].filter(Boolean).join(' · ')}
          </Text>
        )}
        {r.photos.length > 0 && (
          <View className="mt-1 flex-row gap-2">
            {r.photos.slice(0, 4).map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: 56, height: 56, borderRadius: 8 }} />
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={sorted}
        keyExtractor={(r) => r.id}
        renderItem={renderRound}
        contentContainerClassName="grow p-4"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center gap-2 p-6">
            <Text className="text-3xl font-semibold text-foreground">No rounds yet</Text>
            <Text className="text-center text-muted-foreground">
              Log your first round to start filling in the map and earning rarity points.
            </Text>
          </View>
        }
      />
      <Button className="absolute bottom-6 right-4 shadow-lg" onPress={() => router.push('/log-round')}>
        <Text>+ Log round</Text>
      </Button>
    </View>
  );
}
