import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Friend } from '@/models/types';
import { useAppStore } from '@/store/use-app-store';

export default function FriendsScreen() {
  const theme = useTheme();
  const friends = useAppStore((s) => s.friends);
  const rounds = useAppStore((s) => s.rounds);
  const addFriend = useAppStore((s) => s.addFriend);
  const removeFriend = useAppStore((s) => s.removeFriend);

  const [name, setName] = useState('');
  const [handicap, setHandicap] = useState('');

  const roundsTogether = (friendId: string) =>
    rounds.filter((r) => r.playedWith.includes(friendId)).length;

  const submit = () => {
    if (!name.trim()) return;
    addFriend({ name: name.trim(), handicap: handicap ? Number(handicap) : undefined });
    setName('');
    setHandicap('');
  };

  const confirmRemove = (friend: Friend) =>
    Alert.alert('Remove friend', `Remove ${friend.name}? They'll be untagged from your rounds.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFriend(friend.id) },
    ]);

  const renderFriend = ({ item: f }: { item: Friend }) => (
    <Pressable style={styles.row} onLongPress={() => confirmRemove(f)}>
      <View style={[styles.avatar, { backgroundColor: f.avatarColor }]}>
        <ThemedText type="smallBold" style={styles.avatarText}>
          {f.name.slice(0, 1).toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.rowText}>
        <ThemedText>{f.name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {f.handicap !== undefined ? `HCP ${f.handicap} · ` : ''}
          {roundsTogether(f.id)} rounds together
        </ThemedText>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.form}>
        <TextInput
          style={[styles.input, styles.nameInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          value={name}
          onChangeText={setName}
          placeholder="Friend's name"
          placeholderTextColor={theme.textSecondary}
        />
        <TextInput
          style={[styles.input, styles.hcpInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
          value={handicap}
          onChangeText={setHandicap}
          keyboardType="numeric"
          placeholder="HCP"
          placeholderTextColor={theme.textSecondary}
        />
        <Pressable style={styles.addButton} onPress={submit}>
          <ThemedText type="smallBold" style={styles.addButtonText}>Add</ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(f) => f.id}
        renderItem={renderFriend}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <ThemedText type="subtitle">No friends yet</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Add the people you play with, then tag them when logging rounds. Real accounts
              and friend requests arrive with the Supabase backend.
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  form: { flexDirection: 'row', gap: Spacing.two, padding: Spacing.three },
  input: { borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, fontSize: 16 },
  nameInput: { flex: 1 },
  hcpInput: { width: 70 },
  addButton: { backgroundColor: '#2E7D32', borderRadius: 10, justifyContent: 'center', paddingHorizontal: Spacing.three },
  addButtonText: { color: '#fff' },
  list: { paddingHorizontal: Spacing.three, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two + 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff' },
  rowText: { flex: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  emptyText: { textAlign: 'center' },
});
