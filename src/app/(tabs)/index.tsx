import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Globe, { GlobeMarker, MIN_ZOOM } from '@/components/globe';
import { useTabBarSpace } from '@/components/tab-bar';
import { Text } from '@/components/ui/text';
import { colors, HEAT_STOPS } from '@/constants/theme';
import { buildHeatCells } from '@/lib/heat-cells';
import { computeProgression } from '@/lib/progression';
import { usePlayedCourseIds, usePlayerData } from '@/store/use-app-store';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const tabSpace = useTabBarSpace();
  const { rounds, wishlist, courses } = usePlayerData();
  const playedIds = usePlayedCourseIds();
  const progression = useMemo(
    () => computeProgression(rounds, courses, wishlist),
    [courses, rounds, wishlist]
  );
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

      {/* Top bar: what this globe shows, and where you stand */}
      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <View>
          <Text className="font-bold text-2xl text-foreground">Global Play</Text>
          <Text className="text-xs text-muted-foreground">
            {empty
              ? 'Nowhere yet'
              : `${playedIds.size} course${playedIds.size === 1 ? '' : 's'} · ${rounds.length} round${rounds.length === 1 ? '' : 's'}`}
          </Text>
        </View>
        <Pressable
          className="flex-row items-center gap-1.5 rounded-full bg-card/90 px-3 py-2 active:opacity-80"
          onPress={() => router.push('/trophies')}
          accessibilityLabel={`${progression.total} points, level ${progression.level.number}. Open trophies`}
        >
          <Ionicons name="sparkles" size={14} color={colors.warm} />
          <Text className="font-bold text-sm text-foreground">
            {progression.total.toLocaleString()}
          </Text>
          <Text className="text-xs text-muted-foreground">· Lv {progression.level.number}</Text>
        </Pressable>
      </View>

      {/* Heat legend, only meaningful once there is heat */}
      {!empty && (
        <View
          className="absolute left-4 rounded-xl bg-card/90 px-3 py-2"
          style={{ bottom: tabSpace + 16 }}
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

    </View>
  );
}
