import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppStore } from '@/store/use-app-store';

const GREEN = '#2E7D32';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LogRoundScreen() {
  const router = useRouter();
  const theme = useTheme();
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
    if (!result.canceled) {
      setPhotos((p) => [...p, ...result.assets.map((a) => a.uri)]);
    }
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

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }];

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ThemedText type="smallBold">Course</ThemedText>
        {selectedCourse ? (
          <Pressable style={styles.selectedCourse} onPress={() => { setCourseId(undefined); setCourseQuery(''); }}>
            <ThemedText>{selectedCourse.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">Tap to change</ThemedText>
          </Pressable>
        ) : (
          <>
            <TextInput
              style={inputStyle}
              placeholder="Search courses…"
              placeholderTextColor={theme.textSecondary}
              value={courseQuery}
              onChangeText={setCourseQuery}
            />
            {courseMatches.map((c) => (
              <Pressable key={c.id} style={styles.courseOption} onPress={() => setCourseId(c.id)}>
                <ThemedText>{c.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {[c.city, c.country].filter(Boolean).join(', ')}
                </ThemedText>
              </Pressable>
            ))}
          </>
        )}

        <ThemedText type="smallBold">Date</ThemedText>
        <TextInput
          style={inputStyle}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.textSecondary}
        />

        <ThemedText type="smallBold">Holes</ThemedText>
        <View style={styles.chipRow}>
          {([9, 18] as const).map((h) => (
            <Pressable
              key={h}
              style={[styles.chip, holesPlayed === h && styles.chipActive]}
              onPress={() => setHolesPlayed(h)}
            >
              <ThemedText type="small" style={holesPlayed === h ? styles.chipActiveText : undefined}>
                {h} holes
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <ThemedText type="smallBold">Score (gross)</ThemedText>
        <TextInput
          style={inputStyle}
          value={score}
          onChangeText={setScore}
          keyboardType="number-pad"
          placeholder="e.g. 84"
          placeholderTextColor={theme.textSecondary}
        />

        <ThemedText type="smallBold">Played with</ThemedText>
        {friends.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            Add friends in the Friends tab to tag playing partners.
          </ThemedText>
        ) : (
          <View style={styles.chipRow}>
            {friends.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.chip, playedWith.includes(f.id) && styles.chipActive]}
                onPress={() => togglePartner(f.id)}
              >
                <ThemedText type="small" style={playedWith.includes(f.id) ? styles.chipActiveText : undefined}>
                  {f.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        )}

        <ThemedText type="smallBold">Occasion</ThemedText>
        <TextInput
          style={inputStyle}
          value={occasion}
          onChangeText={setOccasion}
          placeholder="e.g. Birthday trip, society day"
          placeholderTextColor={theme.textSecondary}
        />

        <ThemedText type="smallBold">Tags</ThemedText>
        <TextInput
          style={inputStyle}
          value={tags}
          onChangeText={setTags}
          placeholder="links, windy, stag-do (comma separated)"
          placeholderTextColor={theme.textSecondary}
        />

        <ThemedText type="smallBold">Photos</ThemedText>
        <View style={styles.chipRow}>
          {photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={styles.photo} />
          ))}
          <Pressable style={styles.chip} onPress={pickPhoto}>
            <ThemedText type="small">+ Add photo</ThemedText>
          </Pressable>
        </View>

        <ThemedText type="smallBold">Notes</ThemedText>
        <TextInput
          style={[...inputStyle, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          multiline
          placeholder="Best shot, conditions, who won the money…"
          placeholderTextColor={theme.textSecondary}
        />

        <Pressable style={styles.saveButton} onPress={save}>
          <ThemedText type="smallBold" style={styles.saveText}>Save round</ThemedText>
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  input: { borderRadius: 10, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two + 2, fontSize: 16 },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  selectedCourse: { borderRadius: 10, borderWidth: 1, borderColor: GREEN, padding: Spacing.three },
  courseOption: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.one },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#9E9E9E',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipActiveText: { color: '#fff' },
  photo: { width: 56, height: 56, borderRadius: 8 },
  saveButton: {
    marginTop: Spacing.three,
    backgroundColor: GREEN,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  saveText: { color: '#fff' },
});
