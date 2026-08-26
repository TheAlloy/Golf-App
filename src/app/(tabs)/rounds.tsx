import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
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
        style={styles.card}
        onPress={() => router.push({ pathname: '/course/[id]', params: { id: r.courseId } })}
      >
        <View style={styles.cardHeader}>
          <ThemedText type="smallBold">{course?.name ?? 'Unknown course'}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">{r.date}</ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {r.holesPlayed} holes
          {r.score !== undefined ? ` · ${r.score} (${r.toPar! >= 0 ? '+' : ''}${r.toPar})` : ''}
          {r.playedWith.length > 0 ? ` · with ${r.playedWith.map(friendName).join(', ')}` : ''}
        </ThemedText>
        {(r.occasion || r.tags.length > 0) && (
          <ThemedText type="small" themeColor="textSecondary">
            {[r.occasion, ...r.tags.map((t) => `#${t}`)].filter(Boolean).join(' · ')}
          </ThemedText>
        )}
        {r.photos.length > 0 && (
          <View style={styles.photoRow}>
            {r.photos.slice(0, 4).map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.photo} />
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={sorted}
        keyExtractor={(r) => r.id}
        renderItem={renderRound}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText type="subtitle">No rounds yet</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Log your first round to start filling in the map and earning rarity points.
            </ThemedText>
          </View>
        }
      />
      <Pressable style={styles.fab} onPress={() => router.push('/log-round')}>
        <ThemedText type="smallBold" style={styles.fabText}>+ Log round</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: Spacing.three, gap: Spacing.two, flexGrow: 1 },
  card: { paddingVertical: Spacing.three, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#9E9E9E55' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  photo: { width: 56, height: 56, borderRadius: 8 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  emptyText: { textAlign: 'center' },
  fab: {
    position: 'absolute',
    right: Spacing.three,
    bottom: Spacing.four,
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
