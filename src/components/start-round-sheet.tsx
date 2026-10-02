import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { barOffset } from '@/components/tab-bar';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { nearestCatalogueCourses, NearbyCourse } from '@/data/course-catalogue';

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
  | { kind: 'failed' };

/**
 * The sheet behind the nav bar's +. Two ways in: start a round at the course
 * you're standing on (found by GPS), or add one you've already played.
 * Starting live hands the chosen course to the round logger; the live
 * tracker screen will take over from there once it exists.
 */
export function StartRoundSheet({ visible, onClose }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>({ kind: 'choose' });

  // Closing resets, so every opening starts from the two choices.
  const close = () => {
    onClose();
    setStep({ kind: 'choose' });
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

  const openLogger = (courseId?: string) => {
    close();
    router.push(courseId ? { pathname: '/log-round', params: { courseId } } : '/log-round');
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
              <Text className="font-bold text-lg text-foreground">New round</Text>
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
                  onPress={() => openLogger(course.id)}
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
              <Pressable className="items-center py-2" onPress={() => openLogger()}>
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
                onPress={() => openLogger()}
                primary
              />
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
