import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { barOffset } from '@/components/liquid-pill-bar';
import { Text, withFontFamily } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { searchCatalogue } from '@/data/course-catalogue';
import { CHECK_IN_HOURS, names, whenOptions } from '@/lib/check-ins';
import { cn } from '@/lib/cn';
import { CheckIn, CheckInPerson, Course } from '@/models/types';
import { useAppStore, useCourse } from '@/store/use-app-store';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** The course to tag, when known; otherwise the sheet asks. */
  courseId?: string;
  /** People to start with ticked, e.g. who's on the live card. */
  initialWith?: CheckInPerson[];
  onTagged?: (checkIn: CheckIn) => void;
};

/**
 * "Tag me here": post that you're playing at a course, when, and with whom,
 * so friends see it on their globe. A friend chip ticks them onto the tag;
 * anyone not on the app yet can be typed in by name.
 */
export function CheckInSheet({ visible, onClose, courseId, initialWith, onTagged }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/60"
        onPress={onClose}
        accessibilityLabel="Close"
      >
        <Pressable
          className="gap-4 rounded-3xl border border-border bg-elevated p-4"
          style={{ marginHorizontal: 16, marginBottom: barOffset(insets.bottom) }}
          onPress={() => {}}
          accessibilityViewIsModal
        >
          {/* Mounted afresh each opening, so the form starts from what the caller knows. */}
          {visible && (
            <Form
              courseId={courseId}
              initialWith={initialWith}
              onClose={onClose}
              onTagged={onTagged}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Form({ courseId, initialWith, onClose, onTagged }: Omit<Props, 'visible'>) {
  const friends = useAppStore((s) => s.friends);
  const customCourses = useAppStore((s) => s.customCourses);
  const addCheckIn = useAppStore((s) => s.addCheckIn);

  const [pickedId, setPickedId] = useState<string | undefined>(courseId);
  const [query, setQuery] = useState('');
  const [whenId, setWhenId] = useState('now');
  const [withPeople, setWithPeople] = useState<CheckInPerson[]>(initialWith ?? []);
  const [guest, setGuest] = useState('');
  const [note, setNote] = useState('');
  const course = useCourse(pickedId);

  const options = useMemo(() => whenOptions(), []);
  const matches = useMemo((): Course[] => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const mine = customCourses.filter((c) => `${c.name} ${c.city}`.toLowerCase().includes(q));
    return [...mine, ...searchCatalogue(query, 8)].slice(0, 8);
  }, [query, customCourses]);

  const toggleFriend = (friendId: string, name: string) =>
    setWithPeople((list) =>
      list.some((p) => p.friendId === friendId)
        ? list.filter((p) => p.friendId !== friendId)
        : [...list, { friendId, name }]
    );
  const addGuest = () => {
    const name = guest.trim();
    if (!name) return;
    setWithPeople((list) => (list.some((p) => p.name === name) ? list : [...list, { name }]));
    setGuest('');
  };
  const removePerson = (person: CheckInPerson) =>
    setWithPeople((list) => list.filter((p) => p !== person));

  const submit = () => {
    if (!course) return;
    const when = options.find((o) => o.id === whenId) ?? options[0];
    const tag = addCheckIn({
      courseId: course.id,
      startsAt: when.startsAt(),
      with: withPeople,
      note,
    });
    onClose();
    if (tag) onTagged?.(tag);
  };

  const guests = withPeople.filter((p) => !p.friendId);
  const whenLabel = options.find((o) => o.id === whenId)?.label ?? 'Now';

  return (
    <>
      <View className="flex-row items-center gap-2">
        <Ionicons name="pricetag" size={16} color={colors.primaryBright} />
        <Text className="flex-1 font-bold text-lg text-foreground">
          {course ? 'Tag yourself here' : 'Where are you playing?'}
        </Text>
      </View>

      {course ? (
        <Pressable
          className="flex-row items-center gap-3 rounded-2xl bg-card p-3 active:opacity-80"
          onPress={() => !courseId && setPickedId(undefined)}
          disabled={!!courseId}
          accessibilityRole="button"
          accessibilityLabel={`${course.name}${courseId ? '' : '. Change course'}`}
        >
          <Ionicons name="golf-outline" size={18} color={colors.mutedForeground} />
          <View className="flex-1">
            <Text className="font-semibold text-sm text-foreground" numberOfLines={1}>
              {course.name}
            </Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {[course.city, course.country].filter(Boolean).join(', ')}
            </Text>
          </View>
          {!courseId && <Text className="text-xs text-primary-bright">Change</Text>}
        </Pressable>
      ) : (
        <>
          <TextInput
            className={withFontFamily(
              'h-12 rounded-xl border border-input bg-background px-4 text-base text-foreground'
            )}
            value={query}
            onChangeText={setQuery}
            placeholder="Search courses…"
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            autoCorrect={false}
            accessibilityLabel="Search courses"
          />
          {matches.length > 0 && (
            <ScrollView
              className="max-h-48"
              keyboardShouldPersistTaps="handled"
              indicatorStyle="white"
            >
              {matches.map((c) => (
                <Pressable
                  key={c.id}
                  className="flex-row items-center gap-3 border-border border-b py-3 active:opacity-70"
                  onPress={() => setPickedId(c.id)}
                  accessibilityRole="button"
                >
                  <Ionicons name="golf-outline" size={18} color={colors.mutedForeground} />
                  <View className="flex-1">
                    <Text className="font-semibold text-sm" numberOfLines={1}>
                      {c.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                      {[c.city, c.country].filter(Boolean).join(', ')}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
          {query.trim().length > 0 && matches.length === 0 && (
            <Text className="text-sm text-muted-foreground">No courses match that.</Text>
          )}
        </>
      )}

      {course && (
        <>
          {/* When: tee time chips. */}
          <View className="gap-2">
            <Text className="font-semibold text-xs text-muted-foreground">WHEN</Text>
            <View className="flex-row flex-wrap gap-2">
              {options.map((o) => (
                <Chip
                  key={o.id}
                  label={o.label}
                  selected={whenId === o.id}
                  onPress={() => setWhenId(o.id)}
                />
              ))}
            </View>
          </View>

          {/* Who: friends to tag along, and names for anyone else. */}
          <View className="gap-2">
            <Text className="font-semibold text-xs text-muted-foreground">PLAYING WITH</Text>
            {friends.length === 0 && guests.length === 0 && (
              <Text className="text-xs text-muted-foreground">
                Add friends from your profile to tag them, or type a name below.
              </Text>
            )}
            {(friends.length > 0 || guests.length > 0) && (
              <View className="flex-row flex-wrap gap-2">
                {friends.map((f) => {
                  const on = withPeople.some((p) => p.friendId === f.id);
                  return (
                    <Chip
                      key={f.id}
                      label={f.name}
                      selected={on}
                      dot={f.avatarColor}
                      onPress={() => toggleFriend(f.id, f.name)}
                    />
                  );
                })}
                {guests.map((g) => (
                  <Chip
                    key={g.name}
                    label={g.name}
                    selected
                    icon="close"
                    onPress={() => removePerson(g)}
                  />
                ))}
              </View>
            )}
            <View className="flex-row gap-2">
              <TextInput
                className={withFontFamily(
                  'h-10 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground'
                )}
                value={guest}
                onChangeText={setGuest}
                placeholder="Someone not on the app"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={addGuest}
                accessibilityLabel="Add a name"
              />
              <Pressable
                className={cn(
                  'h-10 items-center justify-center rounded-xl bg-card px-3 active:opacity-80',
                  !guest.trim() && 'opacity-40'
                )}
                disabled={!guest.trim()}
                onPress={addGuest}
                accessibilityRole="button"
                accessibilityLabel="Add name"
              >
                <Text className="font-semibold text-sm text-foreground">Add</Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            className={withFontFamily(
              'h-10 rounded-xl border border-input bg-background px-3 text-sm text-foreground'
            )}
            value={note}
            onChangeText={setNote}
            placeholder="A note for friends (optional)"
            placeholderTextColor={colors.mutedForeground}
            maxLength={80}
            accessibilityLabel="Note"
          />

          <Pressable
            className="h-12 flex-row items-center justify-center gap-2 rounded-2xl bg-primary active:opacity-80"
            onPress={submit}
            accessibilityRole="button"
          >
            <Ionicons name="pricetag" size={16} color={colors.primaryForeground} />
            <Text className="font-semibold text-base text-primary-foreground">
              {withPeople.length ? 'Tag us here' : 'Tag me here'}
            </Text>
          </Pressable>
          <Text className="text-center text-[11px] text-muted-foreground">
            {whenLabel === 'Now' ? 'Playing now' : whenLabel}
            {withPeople.length ? ` with ${names(withPeople.map((p) => p.name))}` : ''} · friends see
            it on their globe for {CHECK_IN_HOURS} hours
          </Text>
        </>
      )}
    </>
  );
}

function Chip({
  label,
  selected,
  dot,
  icon,
  onPress,
}: {
  label: string;
  selected: boolean;
  dot?: string;
  icon?: 'close';
  onPress: () => void;
}) {
  return (
    <Pressable
      className={cn(
        'h-9 flex-row items-center gap-2 rounded-full px-3 active:opacity-80',
        selected ? 'bg-primary' : 'bg-card'
      )}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {dot && <View className="h-3 w-3 rounded-full" style={{ backgroundColor: dot }} />}
      <Text
        className={cn(
          'font-semibold text-xs',
          selected ? 'text-primary-foreground' : 'text-foreground'
        )}
      >
        {label}
      </Text>
      {icon && <Ionicons name={icon} size={12} color={colors.primaryForeground} />}
    </Pressable>
  );
}
