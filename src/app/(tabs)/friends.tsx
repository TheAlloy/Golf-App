import { useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Friend } from '@/models/types';
import { useAppStore } from '@/store/use-app-store';

export default function FriendsScreen() {
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
    <Pressable className="flex-row items-center gap-4 py-3" onLongPress={() => confirmRemove(f)}>
      <View
        className="h-10 w-10 items-center justify-center rounded-full"
        style={{ backgroundColor: f.avatarColor }}
      >
        <Text className="font-semibold text-sm text-white">{f.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View className="flex-1">
        <Text>{f.name}</Text>
        <Text className="text-sm text-muted-foreground">
          {f.handicap !== undefined ? `HCP ${f.handicap} · ` : ''}
          {roundsTogether(f.id)} rounds together
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row gap-2 p-4">
        <Input className="flex-1" value={name} onChangeText={setName} placeholder="Friend's name" />
        <Input
          className="w-20"
          value={handicap}
          onChangeText={setHandicap}
          keyboardType="numeric"
          placeholder="HCP"
        />
        <Button onPress={submit}>
          <Text>Add</Text>
        </Button>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(f) => f.id}
        renderItem={renderFriend}
        contentContainerClassName="grow px-4"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center gap-2 p-6">
            <Text className="text-3xl font-semibold text-foreground">No friends yet</Text>
            <Text className="text-center text-muted-foreground">
              Add the people you play with, then tag them when logging rounds. Real accounts and
              friend requests arrive with the Supabase backend.
            </Text>
          </View>
        }
      />
    </View>
  );
}
