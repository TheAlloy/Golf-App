import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import ScorecardEntry from '@/components/scorecard-entry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { searchCatalogue } from '@/data/course-catalogue';
import { cn } from '@/lib/cn';
import { scorecardTotal } from '@/lib/stats';
import { HoleScore } from '@/models/types';
import { useAppStore, useCourse } from '@/store/use-app-store';

type Mode = 'score' | 'holes';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function LogRoundScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ courseId?: string }>();
  const customCourses = useAppStore((s) => s.customCourses);
  const friends = useAppStore((s) => s.friends);
  const addRound = useAppStore((s) => s.addRound);

  const [courseId, setCourseId] = useState<string | undefined>(params.courseId);
  const [courseQuery, setCourseQuery] = useState('');
  const [date, setDate] = useState(todayIso());
  const [holesPlayed, setHolesPlayed] = useState<9 | 18>(18);
  const [mode, setMode] = useState<Mode>('score');
  const [score, setScore] = useState('');
  const [occasion, setOccasion] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [playedWith, setPlayedWith] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [holeScores, setHoleScores] = useState<HoleScore[]>([]);

  const selectedCourse = useCourse(courseId);
  const courseMatches = useMemo(() => {
    if (selectedCourse) return [];
    const q = courseQuery.trim().toLowerCase();
    const mine = q
      ? customCourses.filter((c) => `${c.name} ${c.city}`.toLowerCase().includes(q))
      : customCourses;
    return [...mine, ...searchCatalogue(courseQuery, 10)].slice(0, 12);
  }, [courseQuery, customCourses, selectedCourse]);

  const cardTotal = scorecardTotal(holeScores);
  const par = selectedCourse
    ? holesPlayed === 18
      ? selectedCourse.par
      : Math.round(selectedCourse.par / 2)
    : undefined;

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

    // In hole-by-hole mode the card is the score; otherwise take the typed total.
    const gross = mode === 'holes' ? cardTotal : score ? Number(score) : undefined;
    if (gross === undefined) {
      Alert.alert(
        'Add a score',
        mode === 'holes' ? 'Enter at least one hole.' : 'Enter your total score for the round.'
      );
      return;
    }

    addRound({
      courseId: selectedCourse.id,
      date,
      holesPlayed,
      score: gross,
      toPar: par !== undefined ? gross - par : undefined,
      occasion: occasion.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      playedWith,
      photos,
      holeScores: mode === 'holes' && holeScores.some((h) => h?.strokes !== undefined)
        ? holeScores
        : undefined,
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
            <Text className="text-sm text-muted-foreground">
              {[selectedCourse.city, selectedCourse.region || selectedCourse.country]
                .filter(Boolean)
                .join(', ')}{' '}
              · Par {selectedCourse.par}
            </Text>
          </Pressable>
        ) : (
          <>
            <Input placeholder="Search courses…" value={courseQuery} onChangeText={setCourseQuery} />
            {courseMatches.map((c) => (
              <Pressable key={c.id} className="px-1 py-2" onPress={() => setCourseId(c.id)}>
                <Text>{c.name}</Text>
                <Text className="text-sm text-muted-foreground">
                  {[c.city, c.region || c.country].filter(Boolean).join(', ')}
                </Text>
              </Pressable>
            ))}
          </>
        )}

        <Text className="mt-2 font-semibold text-sm">Date</Text>
        <Input value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />

        <Text className="mt-2 font-semibold text-sm">Holes</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          {([9, 18] as const).map((h) => (
            <Pressable key={h} className={chip(holesPlayed === h)} onPress={() => setHolesPlayed(h)}>
              <Text
                className={cn(
                  'text-sm',
                  holesPlayed === h ? 'text-primary-foreground' : 'text-foreground'
                )}
              >
                {h} holes
              </Text>
            </Pressable>
          ))}
        </View>

        {/* How much detail to record */}
        <Text className="mt-2 font-semibold text-sm">Scoring</Text>
        <View className="flex-row rounded-xl bg-card p-1">
          {(
            [
              ['score', 'Final score', 'Quickest'],
              ['holes', 'Hole by hole', 'Unlocks stats'],
            ] as const
          ).map(([m, label, hint]) => (
            <Pressable
              key={m}
              className={cn(
                'flex-1 items-center rounded-lg py-2',
                mode === m ? 'bg-elevated' : 'bg-transparent'
              )}
              onPress={() => setMode(m)}
            >
              <Text
                className={cn(
                  'font-semibold text-sm',
                  mode === m ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {label}
              </Text>
              <Text className="text-[10px] text-muted-foreground">{hint}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'score' ? (
          <>
            <Input
              value={score}
              onChangeText={setScore}
              keyboardType="number-pad"
              placeholder={par ? `e.g. ${par + 12}` : 'e.g. 84'}
            />
            {par !== undefined && score !== '' && Number(score) > 0 && (
              <Text className="text-xs text-muted-foreground">
                {Number(score) - par === 0
                  ? 'Level par'
                  : `${Number(score) - par > 0 ? '+' : ''}${Number(score) - par} to par`}
              </Text>
            )}
          </>
        ) : (
          <>
            <View className="flex-row items-center justify-between rounded-lg bg-card p-3">
              <Text className="text-sm text-muted-foreground">
                {cardTotal !== undefined ? 'Card total' : 'Tap through the holes below'}
              </Text>
              {cardTotal !== undefined && (
                <Text className="font-bold text-lg text-primary">{cardTotal}</Text>
              )}
            </View>
            {!selectedCourse?.holePars && (
              <View className="flex-row items-start gap-2 rounded-lg bg-card p-3">
                <Ionicons name="information-circle" size={16} color={colors.info} />
                <Text className="flex-1 text-xs text-muted-foreground">
                  This course has no hole-by-hole par on file, so greens in regulation cannot be
                  worked out. Scores, putts and fairways will still be recorded.
                </Text>
              </View>
            )}
            <ScorecardEntry
              holes={holesPlayed}
              pars={selectedCourse?.holePars}
              value={holeScores}
              onChange={setHoleScores}
            />
          </>
        )}

        <Text className="mt-2 font-semibold text-sm">Played with</Text>
        {friends.length === 0 ? (
          <Text className="text-sm text-muted-foreground">
            Add friends from Stats to tag playing partners.
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

        <Text className="mt-2 font-semibold text-sm">Occasion</Text>
        <Input value={occasion} onChangeText={setOccasion} placeholder="e.g. Society day" />

        <Text className="mt-2 font-semibold text-sm">Tags</Text>
        <Input value={tags} onChangeText={setTags} placeholder="links, windy (comma separated)" />

        <Text className="mt-2 font-semibold text-sm">Photos</Text>
        <View className="flex-row flex-wrap items-center gap-2">
          {photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: 56, height: 56, borderRadius: 8 }} />
          ))}
          <Pressable className={chip(false)} onPress={pickPhoto}>
            <Text className="text-sm">+ Add photo</Text>
          </Pressable>
        </View>

        <Text className="mt-2 font-semibold text-sm">Notes</Text>
        <Input
          className="h-24 py-3"
          value={notes}
          onChangeText={setNotes}
          multiline
          textAlignVertical="top"
          placeholder="Conditions, best shot, who won the money…"
        />

        <Button className="mt-4" onPress={save}>
          <Text>Save round</Text>
        </Button>
      </ScrollView>
    </View>
  );
}
