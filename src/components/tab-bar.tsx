import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { StartRoundSheet } from '@/components/start-round-sheet';
import { NAV_COLORS } from '@/constants/theme';

/** Height of the floating pill. */
export const TAB_BAR_HEIGHT = 64;
/**
 * Inset of the selected-tab pill from the bar's edges, on every side: the bar's
 * horizontal padding matches it, so the pill sits as far from the ends of the
 * bar as from its top and bottom.
 */
const PILL_INSET = 8;
const ACTIVE_HEIGHT = TAB_BAR_HEIGHT - PILL_INSET * 2;

/** Gap between the pill and the bottom of the screen. */
function barOffset(bottomInset: number): number {
  // Sit just above the home indicator, or a little off the edge without one.
  return Math.max(bottomInset - 8, 14);
}

/** Space a screen should leave at the bottom so content clears the tab bar. */
export function useTabBarSpace(): number {
  return barOffset(useSafeAreaInsets().bottom) + TAB_BAR_HEIGHT + 8;
}

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Home', icon: 'earth-outline' },
  explore: { label: 'Explore', icon: 'compass-outline' },
  achievements: { label: 'Achievements', icon: 'trophy-outline' },
  profile: { label: 'Profile', icon: 'person-outline' },
};

/**
 * A floating pill of five matching icons: four tabs, with a + in the middle
 * that opens the round logger rather than being a tab of its own.
 */
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [startOpen, setStartOpen] = useState(false);

  const renderTab = (index: number) => {
    const route = state.routes[index];
    const tab = route && TABS[route.name];
    if (!tab) return null;
    const focused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable
        key={route.key}
        className="flex-1 items-center justify-center active:opacity-70"
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
        hitSlop={4}
      >
        <View
          className="items-center justify-center self-stretch"
          style={{
            height: ACTIVE_HEIGHT,
            borderRadius: ACTIVE_HEIGHT / 2,
            backgroundColor: focused ? NAV_COLORS.active : 'transparent',
          }}
        >
          <Ionicons
            name={tab.icon}
            size={25}
            color={focused ? NAV_COLORS.iconActive : NAV_COLORS.icon}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-4"
      style={{ bottom: barOffset(insets.bottom) }}
    >
      <View
        className="flex-row items-center rounded-full"
        style={{
          height: TAB_BAR_HEIGHT,
          paddingHorizontal: PILL_INSET,
          backgroundColor: NAV_COLORS.pill,
          borderWidth: 1,
          borderColor: NAV_COLORS.pillEdge,
          boxShadow: '0 14px 32px rgba(0, 0, 0, 0.55)',
        }}
      >
        {renderTab(0)}
        {renderTab(1)}
        {/* Start or log a round: styled like a tab, but it opens a sheet. */}
        <Pressable
          className="flex-1 items-center justify-center active:opacity-70"
          onPress={() => setStartOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="New round"
          hitSlop={4}
        >
          <Ionicons name="add-circle-outline" size={25} color={NAV_COLORS.icon} />
        </Pressable>
        {renderTab(2)}
        {renderTab(3)}
      </View>
      <StartRoundSheet visible={startOpen} onClose={() => setStartOpen(false)} />
    </View>
  );
}
