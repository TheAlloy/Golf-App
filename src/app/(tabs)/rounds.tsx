import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, View } from 'react-native';

import { ScoreBadge } from '@/components/ui/score-badge';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/constants/theme';
import { Round } from '@/models/types';
import { useAppStore, useCourses } from '@/store/use-app-store';

export default function RoundsScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const rounds = useAppStore((s) => s.rounds);
  const friends = useAppStore((s) => s.friends);
  const courses = useCourses(rounds.map((r) => r.courseId));

  const sorted = [...rounds].sort((a, b) => b.date.localeCompare(a.date));
  const friendName = (fid: string) => friends.find((f) => f.id === fid)?.name ?? 'Unknown';

  const renderRound = ({ item: r }: { item: Round }) => {
    const course = courses.get(r.courseId);
    return (
      <Pressable
        className="mb-2 flex-row items-center gap-3 rounded-xl bg-card p-3"
        onPress={() => router.push({ pathname: '/round/[id]', params: { id: r.id } })}
      >
        {r.photos[0] ? (
          <Image source={{ uri: r.photos[0] }} style={{ width: 56, height: 56, borderRadius: 10 }} />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-lg bg-elevated">
            <Ionicons name="golf-outline" size={20} color={colors.mutedForeground} />
          </View>
        )}
        <View className="flex-1">
          <Text className="font-semibold text-sm">{course?.name ?? 'Unknown course'}</Text>
          <Text className="text-xs text-muted-foreground">
            {[course?.city, course?.region || course?.country].filter(Boolean).join(', ')}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {r.date} · {r.holesPlayed} holes
            {r.playedWith.length > 0 ? ` · with ${r.playedWith.map(friendName).join(', ')}` : ''}
          </Text>
        </View>
        <View className="items-end">
          <Text className="font-bold text-xl text-foreground">{r.score ?? '—'}</Text>
          <ScoreBadge toPar={r.toPar} />
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <FlatList
        data={sorted}
        keyExtractor={(r) => r.id}
        renderItem={renderRound}
        contentContainerClassName="grow p-4 pt-16"
        ListHeaderComponent={
          <Text className="mb-4 font-bold text-3xl text-foreground">Rounds</Text>
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center gap-2 p-6">
            <Ionicons name="golf-outline" size={40} color={colors.mutedForeground} />
            <Text className="font-semibold text-xl text-foreground">No rounds yet</Text>
            <Text className="text-center text-muted-foreground">
              Log your first round to light up the globe and start earning rarity points.
            </Text>
          </View>
        }
      />
    </View>
  );
}
