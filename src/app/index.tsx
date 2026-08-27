import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Globe, { GlobeMarker, MAX_ZOOM, MIN_ZOOM } from '@/components/globe';
import { Text } from '@/components/ui/text';
import { colors, HEAT_STOPS } from '@/constants/theme';
import { buildHeatCells } from '@/lib/heat-cells';
import { useAppStore, useCourses, usePlayedCourseIds } from '@/store/use-app-store';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const rounds = useAppStore((s) => s.rounds);
  const playedIds = usePlayedCourseIds();
  const courses = useCourses(rounds.map((r) => r.courseId));
  const [zoom, setZoom] = useState(MIN_ZOOM);

  const playedCourses = useMemo(
    () =>
      [...playedIds]
        .map((id) => {
          const course = courses.get(id);
          if (!course) return null;
          return { course, rounds: rounds.filter((r) => r.courseId === id).length };
        })
        .filter((c) => c !== null),
    [courses, playedIds, rounds]
  );

  const cells = useMemo(() => buildHeatCells(playedCourses), [playedCourses]);

  const markers: GlobeMarker[] = useMemo(
    () =>
      playedCourses.map(({ course }) => ({
        id: course.id,
        latitude: course.coordinate.latitude,
        longitude: course.coordinate.longitude,
        label: course.name,
      })),
    [playedCourses]
  );

  // Face the globe at the middle of everywhere you have played.
  const initialCentre = useMemo<[number, number] | null>(() => {
    if (playedCourses.length === 0) return null;
    const lng =
      playedCourses.reduce((sum, { course }) => sum + course.coordinate.longitude, 0) /
      playedCourses.length;
    const lat =
      playedCourses.reduce((sum, { course }) => sum + course.coordinate.latitude, 0) /
      playedCourses.length;
    return [lng, lat];
  }, [playedCourses]);

  const onSelectMarker = useCallback(
    (id: string) => router.push({ pathname: '/course/[id]', params: { id } }),
    [router]
  );

  const empty = playedCourses.length === 0;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1">
        <Globe
          width={width}
          height={height}
          cells={cells}
          markers={markers}
          zoom={zoom}
          onZoomChange={setZoom}
          onSelectMarker={onSelectMarker}
          initialCentre={initialCentre}
        />
      </View>

      {/* Top toolbar */}
      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <ToolbarButton icon="stats-chart" onPress={() => router.push('/stats')} />
        <View className="items-center">
          <Text className="font-bold text-lg text-foreground">Global Play</Text>
          <Text className="text-xs text-muted-foreground">
            {empty
              ? 'Nowhere yet'
              : `${playedIds.size} course${playedIds.size === 1 ? '' : 's'} · ${rounds.length} round${rounds.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <ToolbarButton icon="person" onPress={() => router.push('/profile')} />
      </View>

      {/* Empty state: the world stays dark until something is logged. */}
      {empty && (
        <View className="absolute inset-x-0 items-center px-6" style={{ bottom: insets.bottom + 190 }}>
          <Text className="text-center font-semibold text-base text-foreground">
            Your world is dark
          </Text>
          <Text className="mt-1 text-center text-sm text-muted-foreground">
            Log a round and the place you played lights up. The more you play somewhere, the
            brighter it burns.
          </Text>
        </View>
      )}

      {/* Heat legend, only meaningful once there is heat */}
      {!empty && (
        <View
          className="absolute left-4 rounded-xl bg-card/90 px-3 py-2"
          style={{ bottom: insets.bottom + 96 }}
        >
          <Text className="text-xs text-muted-foreground">Courses played</Text>
          <View className="mt-1.5 flex-row items-center gap-2">
            <Text className="text-[10px] text-muted-foreground">1</Text>
            <View className="h-1.5 w-24 flex-row overflow-hidden rounded-full">
              {HEAT_STOPS.map((c) => (
                <View key={c} className="h-full flex-1" style={{ backgroundColor: c }} />
              ))}
            </View>
            <Text className="text-[10px] text-muted-foreground">50+</Text>
          </View>
        </View>
      )}

      {/* Zoom controls */}
      <View className="absolute right-4 gap-2" style={{ bottom: insets.bottom + 96 }}>
        <ToolbarButton
          icon="add"
          onPress={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.6))}
          disabled={zoom >= MAX_ZOOM}
        />
        <ToolbarButton
          icon="remove"
          onPress={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.6))}
          disabled={zoom <= MIN_ZOOM}
        />
      </View>

      {/* The one action: add a round */}
      <View className="absolute inset-x-0 items-center" style={{ bottom: insets.bottom + 20 }}>
        <Pressable
          className="h-16 w-16 items-center justify-center rounded-full bg-primary active:opacity-90"
          onPress={() => router.push('/log-round')}
          accessibilityLabel="Log a round"
        >
          <Ionicons name="add" size={32} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}

function ToolbarButton({
  icon,
  onPress,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      className="h-11 w-11 items-center justify-center rounded-full bg-card/90 active:opacity-80"
      style={{ opacity: disabled ? 0.35 : 1 }}
      onPress={disabled ? undefined : onPress}
    >
      <Ionicons name={icon} size={20} color={colors.foreground} />
    </Pressable>
  );
}
