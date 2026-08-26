import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';
import { useAppStore } from '@/store/use-app-store';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LogRoundScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const courses = useAppStore((s) => s.courses);
  const friends = useAppStore((s) => s.friends);
  const addRound = useAppStore((s) => s.addRound);

  const [courseId, setCourseId] = useState<string | undefined>(params.courseId);
  const [courseQuery, setCourseQuery] = useState('');
  const [date, setDate] = useState(todayIso());
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  const [score, setScore] = useState('');
  const [occasion, setOccasion] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [playedWith, setPlayedWith] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const courseMatches = useMemo(() => {
    if (selectedCourse) return [];
    const q = courseQuery.trim().toLowerCase();
    const list = q
      ? courses.filter((c) => `${c.name} ${c.city} ${c.country}`.toLowerCase().includes(q))
      : courses;
    return list.slice(0, 8);
  }, [courses, courseQuery, selectedCourse]);

  const togglePartner = (friendId: string) =>
    setPlayedWith((ids) =>
      ids.includes(friendId) ? ids.filter((id) => id !== friendId) : [...ids, friendId]
    );

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) setPhotos((p) => [...p, ...result.assets.map((a) => a.uri)]);
  };

  const save = () => {
    if (!selectedCourse) {
      Alert.alert('Pick a course', 'Choose which course you played.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      Alert.alert('Check the date', 'Use the format YYYY-MM-DD.');
      return;
    }
    const gross = score ? Number(score) : undefined;
    const par = holesPlayed === 18 ? selectedCourse.par : Math.round(selectedCourse.par / 2);
    addRound({
      courseId: selectedCourse.id,
      date,
      holesPlayed,
      score: gross,
      toPar: gross !== undefined ? gross - par : undefined,
      occasion: occasion.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      playedWith,
      photos,
    });
    router.back();
  };

  const chip = (active: boolean) =>
    cn(
      'rounded-full border px-4 py-1.5',
      active ? 'border-primary bg-primary' : 'border-border bg-background'
    );

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-2 p-4 pb-16" keyboardShouldPersistTaps="handled">
        <Text className="font-semibold text-sm">Course</Text>
        {selectedCourse ? (
          <Pressable
            className="rounded-lg border border-primary p-4"
            onPress={() => {
              setCourseId(undefined);
              setCourseQuery('');
            }}
          >
            <Text>{selectedCourse.name}</Text>
            <Text className="text-sm text-muted-foreground">Tap to change</Text>
          </Pressable>
        ) : (
          <>
            <Input placeholder="Search courses…" value={courseQuery} onChangeText={setCourseQuery} />
            {courseMatches.map((c) => (
              <Pressable key={c.id} className="px-1 py-2" onPress={() => setCourseId(c.id)}>
                <Text>{c.name}</Text>
                <Text className="text-sm text-muted-foreground">
                  {[c.city, c.country].filter(Boolean).join(', ')}
                </Text>
              </Pressable>
            ))}
          </>
        )}

        <Text className="font-semibold text-sm">Date</Text>
        <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        <Text className="font-semibold text-sm">Holes</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          {([9, 18] as const).map((h) => (
            <Pressable key={h} className={chip(holesPlayed === h)} onPress={() => setHolesPlayed(h)}>
              <Text
                className={cn('text-sm', holesPlayed === h ? 'text-primary-foreground' : 'text-foreground')}
              >
                {h} holes
              </Text>
            </Pressable>
          ))}
        </View>

        <Text className="font-semibold text-sm">Score (gross)</Text>
        <Input value={score} onChangeText={setScore} keyboardType="number-pad" placeholder="e.g. 84" />

        <Text className="font-semibold text-sm">Played with</Text>
        {friends.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            Add friends in the Friends tab to tag playing partners.
          </Text>
        ) : (
          <View className="flex-row flex-wrap items-center gap-2">
            {friends.map((f) => (
              <Pressable
                key={f.id}
                className={chip(playedWith.includes(f.id))}
                onPress={() => togglePartner(f.id)}
              >
                <Text
                  className={cn(
                    'text-sm',
                    playedWith.includes(f.id) ? 'text-primary-foreground' : 'text-foreground'
                  )}
                >
                  {f.name}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text className="font-semibold text-sm">Occasion</Text>
        <Input
          value={occasion}
          onChangeText={setOccasion}
          placeholder="e.g. Birthday trip, society day"
        />

        <Text className="font-semibold text-sm">Tags</Text>
        <Input
          value={tags}
          onChangeText={setTags}
          placeholder="links, windy, stag-do (comma separated)"
        />

        <Text className="font-semibold text-sm">Photos</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          {photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: 56, height: 56, borderRadius: 8 }} />
          ))}
          <Pressable className={chip(false)} onPress={pickPhoto}>
            <Text className="text-sm">+ Add photo</Text>
          </Pressable>
        </View>

        <Text className="font-semibold text-sm">Notes</Text>
        <Input
          className="h-24 py-3"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          placeholder="Best shot, conditions, who won the money…"
        />

        <Button className="mt-4" onPress={save}>
          <Text>Save round</Text>
        </Button>
      </ScrollView>
    </View>
  );
}
