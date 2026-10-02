import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LiquidPillBar, PillSlot, useTabBarSpace } from '@/components/liquid-pill-bar';
import LiveMap from '@/components/live/live-map';
import LiveScorecard from '@/components/live/live-scorecard';
import { Text } from '@/components/ui/text';
import { colors, GLOBE_COLORS } from '@/constants/theme';
import { liveHolePar } from '@/lib/live-round';
import { useLiveLocation } from '@/lib/use-live-location';
import { useWind } from '@/lib/wind';
import { useAppStore, useCourse } from '@/store/use-app-store';

type Tab = 'map' | 'card';

/** Height of the floating header: course line plus the hole stepper. */
const HEADER_HEIGHT = 92;

/**
 * A round in play. The course map and the live scorecard share a header with
 * the hole you're on; the bar below swaps between them, and Exit returns home
 * with the round still live behind the club icon.
 */
export default function PlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const live = useAppStore((s) => s.liveRound);
  const course = useCourse(live?.courseId);
  const updateLiveRound = useAppStore((s) => s.updateLiveRound);
  const finishLiveRound = useAppStore((s) => s.finishLiveRound);
  const discardLiveRound = useAppStore((s) => s.discardLiveRound);
  const setLivePar = useAppStore((s) => s.setLivePar);
  const [tab, setTab] = useState<Tab>('map');
  const bottomSpace = useTabBarSpace();

  const location = useLiveLocation(!!live && tab === 'map');
  const wind = useWind(course?.coordinate);

  if (!live || !course) return <Redirect href="/" />;

  const topSpace = insets.top + HEADER_HEIGHT;
  const hole = live.currentHole;
  const par = liveHolePar(course, live, hole);
  // Catalogue par can't be changed; a par you set yourself cycles 3, 4, 5.
  const parEditable = course.holePars?.[hole - 1] === undefined;
  const cyclePar = () => setLivePar(hole, par === undefined ? 4 : par >= 5 ? 3 : par + 1);

  const exit = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const finish = () => {
    const round = finishLiveRound();
    if (round) router.replace({ pathname: '/round/[id]', params: { id: round.id } });
    else router.replace('/');
  };
  const discard = () => {
    discardLiveRound();
    router.replace('/');
  };

  const slots: PillSlot[] = [
    { key: 'map', icon: 'map-outline', label: 'Map', onPress: () => setTab('map') },
    { key: 'card', icon: 'list-outline', label: 'Scorecard', onPress: () => setTab('card') },
    { key: 'exit', icon: 'exit-outline', label: 'Exit', role: 'button', onPress: exit },
  ];

  return (
    <View className="flex-1 bg-background">
      {tab === 'map' ? (
        <LiveMap
          course={course}
          live={live}
          fix={location.kind === 'fix' ? location.fix : null}
          wind={wind}
          topSpace={topSpace}
          bottomSpace={bottomSpace}
        />
      ) : (
        <LiveScorecard
          course={course}
          live={live}
          topSpace={topSpace}
          bottomSpace={bottomSpace}
          onFinish={finish}
          onDiscard={discard}
        />
      )}

      {/* Header: the course and the hole, floating over either view. */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0"
        style={{ paddingTop: insets.top, height: topSpace }}
      >
        <View
          className="mx-4 mt-2 rounded-2xl px-3 py-2"
          style={{
            backgroundColor: GLOBE_COLORS.callout,
            borderWidth: 1,
            borderColor: GLOBE_COLORS.calloutEdge,
          }}
        >
          <View className="flex-row items-center gap-2">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: 'hsl(68, 92%, 60%)' }}
              accessibilityLabel="Live"
            />
            <Text className="flex-1 font-semibold text-sm text-foreground" numberOfLines={1}>
              {course.name}
            </Text>
            {location.kind === 'fix' ? (
              <Ionicons name="navigate" size={13} color={colors.primaryBright} />
            ) : location.kind === 'waiting' ? (
              <Ionicons name="navigate-outline" size={13} color={colors.mutedForeground} />
            ) : (
              <Ionicons name="navigate-outline" size={13} color={colors.destructive} />
            )}
          </View>
          <View className="mt-1 flex-row items-center justify-between">
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
              onPress={() => hole > 1 && updateLiveRound({ currentHole: hole - 1 })}
              disabled={hole <= 1}
              accessibilityRole="button"
              accessibilityLabel="Previous hole"
              style={{ opacity: hole <= 1 ? 0.3 : 1 }}
            >
              <Ionicons name="chevron-back" size={20} color={colors.foreground} />
            </Pressable>
            <View className="items-center">
              <Text className="font-bold text-lg leading-6 text-foreground">Hole {hole}</Text>
              <Pressable
                onPress={cyclePar}
                disabled={!parEditable}
                accessibilityRole="button"
                accessibilityLabel={par ? `Par ${par}` : 'Set par'}
                hitSlop={6}
              >
                <Text className="text-xs text-muted-foreground">
                  {par ? `Par ${par}` : 'Set par'}
                  {parEditable && par ? ' ✎' : ''} · {live.holesPlayed} holes
                </Text>
              </Pressable>
            </View>
            <Pressable
              className="h-9 w-9 items-center justify-center rounded-full active:opacity-60"
              onPress={() => hole < live.holesPlayed && updateLiveRound({ currentHole: hole + 1 })}
              disabled={hole >= live.holesPlayed}
              accessibilityRole="button"
              accessibilityLabel="Next hole"
              style={{ opacity: hole >= live.holesPlayed ? 0.3 : 1 }}
            >
              <Ionicons name="chevron-forward" size={20} color={colors.foreground} />
            </Pressable>
          </View>
        </View>
      </View>

      <LiquidPillBar slots={slots} activeSlot={tab === 'map' ? 0 : 1} />
    </View>
  );
}
