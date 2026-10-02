import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { barOffset } from '@/components/liquid-pill-bar';
import { Text, withFontFamily } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import {
  findCatalogueCourse,
  nearestCatalogueCourses,
  NearbyCourse,
  searchCatalogue,
} from '@/data/course-catalogue';
import { useAppStore } from '@/store/use-app-store';

type Props = { visible: boolean; onClose: () => void };

/** How far away a course can be and still count as "here". */
const HERE_KM = 5;
/** Give up on a fix after this long; a browser that never answers a permission prompt would otherwise spin forever. */
const LOCATE_TIMEOUT_MS = 12_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

type Step =
  | { kind: 'choose' }
  | { kind: 'locating' }
  | { kind: 'found'; nearby: NearbyCourse[] }
  | { kind: 'none' }
  | { kind: 'denied' }
  | { kind: 'failed' }
  | { kind: 'pick' };

/**
 * The sheet behind the nav bar's +. Two ways in: start a round at the course
 * you're standing on (found by GPS, or searched for), which opens the live
 * round screen; or add one you've already played, which opens the logger.
 */
export function StartRoundSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>({ kind: 'choose' });
  const [query, setQuery] = useState('');
  const customCourses = useAppStore((s) => s.customCourses);
  const startLiveRound = useAppStore((s) => s.startLiveRound);

  // Closing resets, so every opening starts from the two choices.
  const close = () => {
    onClose();
    setStep({ kind: 'choose' });
    setQuery('');
  };

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const mine = customCourses.filter((c) => `${c.name} ${c.city}`.toLowerCase().includes(q));
    return [...mine, ...searchCatalogue(query, 8)].slice(0, 8);
  }, [query, customCourses]);

  const startLive = (courseId: string) => {
    const course = customCourses.find((c) => c.id === courseId) ?? findCatalogueCourse(courseId);
    startLiveRound(courseId, (course?.holes ?? 18) >= 18 ? 18 : 9);
    close();
    router.push('/play');
  };

  const locate = async () => {
    setStep({ kind: 'locating' });
    try {
      const { status } = await withTimeout(
        Location.requestForegroundPermissionsAsync(),
        LOCATE_TIMEOUT_MS
      );
      if (status !== 'granted') {
        setStep({ kind: 'denied' });
        return;
      }
      const position = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        LOCATE_TIMEOUT_MS
      );
      const nearby = nearestCatalogueCourses(
        position.coords.latitude,
        position.coords.longitude,
        3,
        HERE_KM
      );
      setStep(nearby.length ? { kind: 'found', nearby } : { kind: 'none' });
    } catch {
      setStep({ kind: 'failed' });
    }
  };

  const openLogger = () => {
    close();
    router.push('/log-round');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        className="flex-1 justify-end bg-black/60"
        onPress={close}
        accessibilityLabel="Close"
      >
        {/* A floating card, 16px in from the sides, its bottom level with the nav bar's. */}
        <Pressable
          className="gap-3 rounded-3xl border border-border bg-elevated p-4"
          style={{ marginHorizontal: 16, marginBottom: barOffset(insets.bottom) }}
          onPress={() => {}}
          accessibilityViewIsModal
        >
          {step.kind === 'choose' && (
            <>
              <Option
                icon="navigate-outline"
                title="Play a round now"
                body="Find the course you're standing on and keep score as you go."
                onPress={locate}
                primary
              />
              <Option
                icon="create-outline"
                title="Add a past round"
                body="Pick a course and enter the score you shot."
                onPress={() => openLogger()}
              />
            </>
          )}

          {step.kind === 'locating' && (
            <View className="items-center gap-3 py-6">
              <ActivityIndicator color={colors.primaryBright} />
              <Text className="text-sm text-muted-foreground">
                Finding the course you&apos;re on…
              </Text>
            </View>
          )}

          {step.kind === 'found' && (
            <>
              <Text className="font-bold text-lg text-foreground">You&apos;re at</Text>
              {step.nearby.map(({ course, distanceKm }, i) => (
                <Pressable
                  key={course.id}
                  className={
                    i === 0
                      ? 'flex-row items-center gap-3 rounded-2xl bg-primary p-4 active:opacity-80'
                      : 'flex-row items-center gap-3 rounded-2xl bg-card p-4 active:opacity-80'
                  }
                  onPress={() => startLive(course.id)}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="golf-outline"
                    size={20}
                    color={i === 0 ? colors.primaryForeground : colors.mutedForeground}
                  />
                  <View className="flex-1">
                    <Text
                      className={
                        i === 0
                          ? 'font-semibold text-base text-primary-foreground'
                          : 'font-semibold text-base text-foreground'
                      }
                      numberOfLines={1}
                    >
                      {course.name}
                    </Text>
                    <Text
                      className={
                        i === 0
                          ? 'text-xs text-primary-foreground/80'
                          : 'text-xs text-muted-foreground'
                      }
                    >
                      {course.city ? `${course.city} · ` : ''}
                      {distanceKm < 1
                        ? `${Math.round(distanceKm * 1000)} m away`
                        : `${distanceKm.toFixed(1)} km away`}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={i === 0 ? colors.primaryForeground : colors.mutedForeground}
                  />
                </Pressable>
              ))}
              <Pressable className="items-center py-2" onPress={() => setStep({ kind: 'pick' })}>
                <Text className="text-sm text-primary-bright">Not here? Pick another course</Text>
              </Pressable>
            </>
          )}

          {(step.kind === 'none' || step.kind === 'denied' || step.kind === 'failed') && (
            <>
              <Text className="font-bold text-lg text-foreground">
                {step.kind === 'none' ? 'No course nearby' : "Couldn't find your position"}
              </Text>
              <Text className="text-sm text-muted-foreground">
                {step.kind === 'none'
                  ? `Nothing in the catalogue within ${HERE_KM} km. Pick the course yourself to carry on.`
                  : step.kind === 'denied'
                    ? 'Location access was declined. Allow it in Settings, or pick the course yourself.'
                    : 'Location is unavailable right now. Pick the course yourself to carry on.'}
              </Text>
              <Option
                icon="search-outline"
                title="Pick a course"
                body="Search the catalogue and start from there."
                onPress={() => setStep({ kind: 'pick' })}
                primary
              />
            </>
          )}

          {step.kind === 'pick' && (
            <>
              <Text className="font-bold text-lg text-foreground">Where are you playing?</Text>
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
                  className="max-h-64"
                  keyboardShouldPersistTaps="handled"
                  indicatorStyle="white"
                >
                  {matches.map((course) => (
                    <Pressable
                      key={course.id}
                      className="flex-row items-center gap-3 border-border border-b py-3 active:opacity-70"
                      onPress={() => startLive(course.id)}
                      accessibilityRole="button"
                    >
                      <Ionicons name="golf-outline" size={18} color={colors.mutedForeground} />
                      <View className="flex-1">
                        <Text className="font-semibold text-sm" numberOfLines={1}>
                          {course.name}
                        </Text>
                        <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                          {[course.city, course.country].filter(Boolean).join(', ')} · Par{' '}
                          {course.par}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              {query.trim().length > 0 && matches.length === 0 && (
                <Text className="text-sm text-muted-foreground">No courses match that.</Text>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  icon,
  title,
  body,
  onPress,
  primary,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      className={
        primary
          ? 'flex-row items-center gap-3 rounded-2xl bg-primary p-4 active:opacity-80'
          : 'flex-row items-center gap-3 rounded-2xl bg-card p-4 active:opacity-80'
      }
      onPress={onPress}
      accessibilityRole="button"
    >
      <View
        className={
          primary
            ? 'h-10 w-10 items-center justify-center rounded-full bg-white/15'
            : 'h-10 w-10 items-center justify-center rounded-full bg-muted'
        }
      >
        <Ionicons
          name={icon}
          size={20}
          color={primary ? colors.primaryForeground : colors.foreground}
        />
      </View>
      <View className="flex-1">
        <Text
          className={
            primary
              ? 'font-semibold text-base text-primary-foreground'
              : 'font-semibold text-base text-foreground'
          }
        >
          {title}
        </Text>
        <Text
          className={
            primary ? 'text-xs text-primary-foreground/80' : 'text-xs text-muted-foreground'
          }
        >
          {body}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={primary ? colors.primaryForeground : colors.mutedForeground}
      />
    </Pressable>
  );
}
