import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Pressable,
  SectionList,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Globe, { GlobeMarker, MIN_ZOOM } from '@/components/globe';
import type { ImageryStatus } from '@/components/terrain-layer';
import {
  APPEARANCE_BUTTON_SIZE,
  AppearanceButton,
  MapAppearance,
} from '@/components/appearance-button';
import { ProgressSummary } from '@/components/progress-summary';
import { useLiquidSlot } from '@/components/liquid-pill-bar';
import { useTabBarSpace } from '@/components/tab-bar';
import { ScoreBadge } from '@/components/ui/score-badge';
import { Text } from '@/components/ui/text';
import { colors, continentShade, GLOBE_COLORS, GLOBE_TERRAIN_COLORS } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { CoverageLevel, coverageShapes } from '@/lib/coverage';
import { IMAGERY, IMAGERY_ENABLED } from '@/lib/imagery';
import { computeProgression } from '@/lib/progression';
import { Course, Round } from '@/models/types';
import { useAppStore, usePlayedCourseIds, usePlayerData } from '@/store/use-app-store';

type HomeView = 'map' | 'list';

/** Length of the dissolve between the globe and the list. */
const VIEW_FADE_MS = 240;
/** Inset of the toggle's pill from its edge, matching the nav bar. */
const TOGGLE_INSET = 4;

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

/** Callout line under a played course: what you shot there, and how often you've been. */
function playedDetail(count: number, best: Round | undefined): string {
  const visits = `${count} round${count === 1 ? '' : 's'}`;
  if (best?.score === undefined) return `Played · ${visits}`;
  const toPar =
    best.toPar === undefined
      ? ''
      : ` (${best.toPar > 0 ? '+' : ''}${best.toPar === 0 ? 'E' : best.toPar})`;
  return `${count > 1 ? 'Best' : 'Shot'} ${best.score}${toPar} · ${visits}`;
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
  // 0 shows the globe, 1 the list; switching dissolves one into the other.
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fade, {
      toValue: view === 'list' ? 1 : 0,
      duration: VIEW_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [view, fade]);
  const mapOpacity = fade.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const toggle = useLiquidSlot(view === 'list' ? 1 : 0);
  const [segmentWidth, setSegmentWidth] = useState(0);
  const [appearance, setAppearance] = useState<MapAppearance>('map');
  const palette = appearance === 'terrain' ? GLOBE_TERRAIN_COLORS : GLOBE_COLORS;
  const [imagery, setImagery] = useState<ImageryStatus>('idle');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const friendCount = useAppStore((s) => s.friends.length);
  // "Where I've played" shading; only the dark map draws it.
  const [coverageLevel, setCoverageLevel] = useState<CoverageLevel>('off');
  const showCoverage = view === 'map' && appearance === 'map';

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

  const coverage = useMemo(
    () =>
      showCoverage
        ? coverageShapes(
            coverageLevel,
            playedCourses.map((p) => p.course)
          )
        : [],
    [coverageLevel, playedCourses, showCoverage]
  );

  const shadedContinents = useMemo(
    () => [...new Set(coverage.map((c) => c.continent))].sort(),
    [coverage]
  );

  // Wishlisted courses you haven't played yet, as their own lime-yellow markers.
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
      ...playedCourses.map(({ course, rounds: count, best }) => ({
        id: course.id,
        latitude: course.coordinate.latitude,
        longitude: course.coordinate.longitude,
        label: course.name,
        kind: 'played' as const,
        detail: playedDetail(count, best),
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
      {/* Both views stay mounted, so the globe keeps its position and zoom
          and the two can dissolve into one another. */}
      {/* Animated.View takes no className, so these wrappers are styled inline. */}
      <Animated.View
        style={{ flex: 1, opacity: mapOpacity }}
        pointerEvents={view === 'map' ? 'auto' : 'none'}
      >
        <Globe
          width={width}
          height={height}
          markers={markers}
          zoom={zoom}
          onZoomChange={setZoom}
          onSelectMarker={onSelectMarker}
          initialCentre={initialCentre}
          appearance={appearance}
          onImageryStatus={setImagery}
          coverage={coverage}
        />
      </Animated.View>

      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: fade }]}
        pointerEvents={view === 'list' ? 'auto' : 'none'}
      >
        <SectionList
          indicatorStyle="white"
          className="flex-1"
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
                Courses you play show up here. Tap + to log your first round.
              </Text>
            </View>
          }
        />
      </Animated.View>

      {/* Top bar: what this globe shows, and where you stand */}
      <View
        className="absolute left-0 right-0 gap-3 px-4 pb-3"
        style={{ top: 0, paddingTop: insets.top + 8 }}
      >
        {/* Solid behind the bar in list view, fading in with it. */}
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, opacity: fade }]}
        />
        <View className="flex-row items-center justify-between">
          <Text className="font-bold text-2xl text-foreground">Global Play</Text>
          <Pressable
            className="flex-row items-center gap-2 rounded-full bg-card/90 px-3 py-2 active:opacity-80"
            onPress={() => setSummaryOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`${progression.total} points, level ${progression.level.number}. Show summary`}
          >
            <Ionicons name="sparkles" size={14} color={colors.warm} />
            <Text className="font-bold text-sm text-foreground">
              {progression.total.toLocaleString()}
            </Text>
            <Text className="text-xs text-muted-foreground">· Lv {progression.level.number}</Text>
          </Pressable>
        </View>

        {/* Map / list toggle and the played filter, with the appearance thumbnail opposite */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View
              className="flex-row self-start rounded-full border border-border bg-card/90"
              style={{ height: APPEARANCE_BUTTON_SIZE, padding: TOGGLE_INSET - 1 }}
              accessibilityRole="tablist"
            >
              {/* The selected pill, one element that glides between the two
                  segments with the nav bar's liquid move. */}
              {segmentWidth > 0 && (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    borderRadius: 999,
                    backgroundColor: colors.primary,
                    left: TOGGLE_INSET - 1,
                    top: TOGGLE_INSET - 1,
                    width: segmentWidth,
                    height: APPEARANCE_BUTTON_SIZE - TOGGLE_INSET * 2,
                    transform: [
                      {
                        translateX: toggle.slot.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, segmentWidth],
                        }),
                      },
                      { scaleX: toggle.stretch },
                    ],
                  }}
                />
              )}
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
                    className="flex-row items-center justify-center gap-2 rounded-full px-4"
                    // Both segments take the wider one's width, so the pill fits either.
                    style={segmentWidth > 0 ? { width: segmentWidth } : undefined}
                    onLayout={(e) =>
                      setSegmentWidth((w) => Math.max(w, Math.ceil(e.nativeEvent.layout.width)))
                    }
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
          <Animated.View
            style={{ opacity: mapOpacity }}
            pointerEvents={view === 'map' ? 'auto' : 'none'}
          >
            <AppearanceButton
              appearance={appearance}
              onAppearanceChange={setAppearance}
              coverage={coverageLevel}
              onCoverageChange={setCoverageLevel}
            />
          </Animated.View>
        </View>
      </View>

      <ProgressSummary
        visible={summaryOpen}
        onClose={() => setSummaryOpen(false)}
        progression={progression}
        rounds={rounds}
        courses={courses}
        wishlist={wishlist}
        friendCount={friendCount}
      />

      {/* Legend: what the two dot colours mean */}
      {(!empty || wishedCourses.length > 0) && (
        <Animated.View
          style={{ position: 'absolute', left: 16, bottom: tabSpace + 16, opacity: mapOpacity }}
          pointerEvents="none"
        >
          <View className="gap-2 rounded-xl bg-card/90 px-3 py-2">
            <View className="flex-row items-center gap-3">
              <LegendDot color={palette.pin} label="Played" />
              <LegendDot color={palette.wishlist} label="Wishlist" />
            </View>
            {/* Each continent shaded gets its own colour; name the ones on show. */}
            {shadedContinents.length > 0 && (
              <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
                {shadedContinents.map((c) => (
                  <LegendDot key={c} color={continentShade(c).swatch} label={c} />
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      )}

      {/* Imagery providers ask to be credited while their tiles are on screen. */}
      {appearance === 'terrain' && IMAGERY_ENABLED && (
        <Animated.View
          style={{ position: 'absolute', right: 16, bottom: tabSpace + 16, opacity: mapOpacity }}
          pointerEvents="none"
        >
          <Text className="rounded-md bg-background/60 px-2 py-1 text-[10px] text-muted-foreground">
            {imagery === 'unavailable'
              ? 'Satellite tiles blocked here'
              : imagery === 'loading'
                ? 'Loading tiles…'
                : `Imagery © ${IMAGERY.attribution}`}
          </Text>
        </Animated.View>
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
        <Text className="mt-1 text-[11px] text-muted-foreground">
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
    <View className="flex-row items-center gap-2">
      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}
