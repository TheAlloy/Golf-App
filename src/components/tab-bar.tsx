import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { IconName, LiquidPillBar, PillSlot } from '@/components/liquid-pill-bar';
import { StartRoundSheet } from '@/components/start-round-sheet';
import { NAV_COLORS } from '@/constants/theme';
import { useAppStore } from '@/store/use-app-store';

export { barOffset, TAB_BAR_HEIGHT, useTabBarSpace } from '@/components/liquid-pill-bar';

/** Which slot each tab index sits in (the + takes slot 2). */
const TAB_SLOT = [0, 1, 3, 4];

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'earth-outline' },
  explore: { label: 'Explore', icon: 'compass-outline' },
  achievements: { label: 'Achievements', icon: 'trophy-outline' },
  profile: { label: 'Profile', icon: 'person-outline' },
};

/**
 * Home's floating bar: four tabs with a + in the middle that opens the new
 * round sheet rather than being a tab of its own. While a round is being
 * played the + becomes a golf club, and takes you back into that round.
 */
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const [startOpen, setStartOpen] = useState(false);
  const liveRound = useAppStore((s) => s.liveRound);

  const tabSlot = (index: number): PillSlot | null => {
    const route = state.routes[index];
    const tab = route && TABS[route.name];
    if (!tab) return null;
    const focused = state.index === index;
    return {
      key: route.key,
      icon: tab.icon,
      label: tab.label,
      onPress: () => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
      },
    };
  };

  const centre: PillSlot = liveRound
    ? {
        key: 'live',
        icon: 'golf',
        label: 'Back to your round',
        role: 'button',
        prominent: true,
        onPress: () => router.push('/play'),
        badge: (
          <View
            pointerEvents="none"
            className="absolute rounded-full"
            style={{
              width: 8,
              height: 8,
              right: '50%',
              marginRight: -24,
              top: 2,
              backgroundColor: NAV_COLORS.live,
              borderWidth: 1.5,
              borderColor: NAV_COLORS.pill,
            }}
          />
        ),
      }
    : {
        key: 'new',
        icon: 'add',
        label: 'New round',
        role: 'button',
        prominent: true,
        onPress: () => setStartOpen(true),
      };

  const slots = [tabSlot(0), tabSlot(1), centre, tabSlot(2), tabSlot(3)].filter(
    (s): s is PillSlot => !!s
  );

  return (
    <>
      <LiquidPillBar slots={slots} activeSlot={TAB_SLOT[state.index] ?? 0} />
      <StartRoundSheet visible={startOpen} onClose={() => setStartOpen(false)} />
    </>
  );
}
