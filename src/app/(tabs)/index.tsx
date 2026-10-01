import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, SectionList, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Globe, { GlobeMarker, MIN_ZOOM } from '@/components/globe';
import { useTabBarSpace } from '@/components/tab-bar';
import { ScoreBadge } from '@/components/ui/score-badge';
import { Text } from '@/components/ui/text';
import { colors, GLOBE_COLORS, HEAT_STOPS } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { buildHeatCells } from '@/lib/heat-cells';
import { computeProgression } from '@/lib/progression';
import { Course, Round } from '@/models/types';
import { usePlayedCourseIds, usePlayerData } from '@/store/use-app-store';

type HomeView = 'map' | 'list';

type PlayedCourse = {
  course: Course;
  rounds: number;
  lastPlayed: string;
  best?: Round;
};

/** "2026-07-20" -> "20 Jul 2026". */
function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      });
}

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
  const [view, setView] = useState<HomeView>('map');
  // The idle spin only runs while the globe is actually on screen.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  const playedCourses = useMemo(
    () =>
      [...playedIds]
        .map((id): PlayedCourse | null => {
          const course = courses.get(id);
          if (!course) return null;
          const here = rounds.filter((r) => r.courseId === id);
          const best = here
            .filter((r) => r.score !== undefined)
            .sort((a, b) => (a.toPar ?? a.score!) - (b.toPar ?? b.score!))[0];
          const lastPlayed = here.reduce((d, r) => (r.date > d ? r.date : d), '');
          return { course, rounds: here.length, lastPlayed, best };
        })
        .filter((c) => c !== null),
    [courses, playedIds, rounds]
  );

  const cells = useMemo(() => buildHeatCells(playedCourses), [playedCourses]);

  // Wishlisted courses you haven't played yet, as their own pink markers.
  const wishedCourses = useMemo(
    () =>
      wishlist
        .filter((w) => !playedIds.has(w.courseId))
        .map((w) => courses.get(w.courseId))
        .filter((c): c is Course => c !== undefined),
    [courses, playedIds, wishlist]
  );

  const markers: GlobeMarker[] = useMemo(
    () => [
      ...playedCourses.map(({ course, rounds: count }) => ({
        id: course.id,
        latitude: course.coordinate.latitude,
        longitude: course.coordinate.longitude,
        label: course.name,
        kind: 'played' as const,
        detail: `Played · ${count} round${count === 1 ? '' : 's'}`,
      })),
      ...wishedCourses.map((course) => ({
        id: course.id,
        latitude: course.coordinate.latitude,
        longitude: course.coordinate.longitude,
        label: course.name,
        kind: 'wishlist' as const,
        detail: 'On your wishlist',
      })),
    ],
    [playedCourses, wishedCourses]
  );

  // Face the globe at the middle of everywhere you have played, or of your
  // wishlist when nothing is played yet.
  const initialCentre = useMemo<[number, number] | null>(() => {
    const focus = playedCourses.length ? playedCourses.map((pc) => pc.course) : wishedCourses;
    if (focus.length === 0) return null;
    const lng = focus.reduce((sum, c) => sum + c.coordinate.longitude, 0) / focus.length;
    const lat = focus.reduce((sum, c) => sum + c.coordinate.latitude, 0) / focus.length;
    return [lng, lat];
  }, [playedCourses, wishedCourses]);

  const onSelectMarker = useCallback(
    (id: string) => router.push({ pathname: '/course/[id]', params: { id } }),
    [router]
  );

  // List view: one section per country, the most-played country first and the
  // most recently played course first within it.
  const sections = useMemo(() => {
    const byCountry = new Map<string, PlayedCourse[]>();
    for (const pc of playedCourses) {
      const key = pc.course.country || 'Elsewhere';
      byCountry.set(key, [...(byCountry.get(key) ?? []), pc]);
    }
    return [...byCountry.entries()]
      .map(([title, data]) => ({
        title,
        data: [...data].sort((a, b) => b.lastPlayed.localeCompare(a.lastPlayed)),
      }))
      .sort((a, b) => b.data.length - a.data.length || a.title.localeCompare(b.title));
  }, [playedCourses]);

  const empty = playedCourses.length === 0;
  const headerHeight = insets.top + 100;

  return (
    <View className="flex-1 bg-background">
      {/* Kept mounted in list view so the globe keeps its spin and zoom. */}
      <View className="flex-1" style={{ display: view === 'map' ? 'flex' : 'none' }}>
        <Globe
          width={width}
          height={height}
          cells={cells}
          markers={markers}
          zoom={zoom}
          onZoomChange={setZoom}
          onSelectMarker={onSelectMarker}
          initialCentre={initialCentre}
          idleSpin={focused && view === 'map'}
        />
      </View>

      {view === 'list' && (
        <SectionList
          indicatorStyle="white"
          className="absolute inset-0"
          sections={sections}
          keyExtractor={(pc) => pc.course.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{
            paddingTop: headerHeight,
            paddingHorizontal: 16,
            paddingBottom: tabSpace + 24,
          }}
          renderSectionHeader={({ section }) => (
            <View className="flex-row items-baseline justify-between pb-2 pt-4">
              <Text className="font-semibold text-sm text-foreground">{section.title}</Text>
              <Text className="text-xs text-muted-foreground">
                {section.data.length} course
                {section.data.length === 1 ? '' : 's'}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-2" />}
          renderItem={({ item }) => (
            <PlayedCourseRow item={item} onPress={() => onSelectMarker(item.course.id)} />
          )}
          ListEmptyComponent={
            <View className="items-center gap-2 py-16">
              <Ionicons name="flag-outline" size={28} color={colors.mutedForeground} />
              <Text className="text-center text-sm text-muted-foreground">
                Courses you play show up here. Open a course in Explore to log your first round.
              </Text>
            </View>
          }
        />
      )}

      {/* Top bar: what this globe shows, and where you stand */}
      <View
        className={cn(
          'absolute left-0 right-0 gap-3 px-4 pb-3',
          view === 'list' && 'bg-background'
        )}
        style={{ top: 0, paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-2xl text-foreground">Global Play</Text>
          <Pressable
            className="flex-row items-center gap-1.5 rounded-full bg-card/90 px-3 py-2 active:opacity-80"
            onPress={() => router.push('/achievements')}
            accessibilityLabel={`${progression.total} points, level ${progression.level.number}. Open achievements`}
          >
            <Ionicons name="sparkles" size={14} color={colors.warm} />
            <Text className="font-bold text-sm text-foreground">
              {progression.total.toLocaleString()}
            </Text>
            <Text className="text-xs text-muted-foreground">· Lv {progression.level.number}</Text>
          </Pressable>
        </View>

        {/* Map / list toggle */}
        <View
          className="flex-row self-start rounded-full border border-border bg-card/90 p-1"
          accessibilityRole="tablist"
        >
          {(
            [
              ['map', 'Map', 'earth'],
              ['list', 'List', 'list'],
            ] as const
          ).map(([v, label, icon]) => {
            const active = view === v;
            return (
              <Pressable
                key={v}
                className={cn(
                  'flex-row items-center gap-1.5 rounded-full px-4 py-1.5',
                  active ? 'bg-primary' : 'bg-transparent'
                )}
                onPress={() => setView(v)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={icon}
                  size={14}
                  color={active ? colors.primaryForeground : colors.mutedForeground}
                />
                <Text
                  className={cn(
                    'font-semibold text-xs',
                    active ? 'text-primary-foreground' : 'text-muted-foreground'
                  )}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Legend: what the glow and the two dot colours mean */}
      {(!empty || wishedCourses.length > 0) && view === 'map' && (
        <View
          className="absolute left-4 gap-2 rounded-xl bg-card/90 px-3 py-2"
          style={{ bottom: tabSpace + 16 }}
        >
          <View className="flex-row items-center gap-3">
            <LegendDot color={GLOBE_COLORS.pin} label="Played" />
            <LegendDot color={GLOBE_COLORS.wishlist} label="Wishlist" />
          </View>
          {!empty && (
            <View className="flex-row items-center gap-2">
              <Text className="text-[10px] text-muted-foreground">1</Text>
              <View className="h-1.5 w-20 flex-row overflow-hidden rounded-full">
                {HEAT_STOPS.map((c) => (
                  <View key={c} className="h-full flex-1" style={{ backgroundColor: c }} />
                ))}
              </View>
              <Text className="text-[10px] text-muted-foreground">50+ courses</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function PlayedCourseRow({ item, onPress }: { item: PlayedCourse; onPress: () => void }) {
  const { course, rounds, lastPlayed, best } = item;
  const place = [course.city, course.region].filter(Boolean).join(', ');
  return (
    <Pressable
      className="flex-row items-center gap-3 rounded-xl bg-card p-3 active:opacity-80"
      onPress={onPress}
    >
      <View className="h-11 w-11 items-center justify-center rounded-lg bg-primary-bright/20">
        <Ionicons name="flag" size={18} color={colors.primaryBright} />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-sm text-foreground" numberOfLines={1}>
          {course.name}
        </Text>
        {place !== '' && (
          <Text className="text-xs text-muted-foreground" numberOfLines={1}>
            {place}
          </Text>
        )}
        <Text className="mt-0.5 text-[11px] text-muted-foreground">
          {rounds} round{rounds === 1 ? '' : 's'} · last {formatDate(lastPlayed)}
        </Text>
      </View>
      {best?.score !== undefined && (
        <View className="items-end">
          <Text className="font-bold text-lg text-foreground">{best.score}</Text>
          <View className="flex-row items-center gap-1">
            <Text className="text-[10px] text-muted-foreground">best</Text>
            <ScoreBadge toPar={best.toPar} className="text-xs" />
          </View>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}
