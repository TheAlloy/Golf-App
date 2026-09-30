import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, NAV_COLORS } from '@/constants/theme';

/** Height of the floating pill. */
export const TAB_BAR_HEIGHT = 64;
/** Diameter of the raised log-a-round button. */
const ACTION_SIZE = 64;
/** How far the action button rises above the pill. */
const ACTION_RISE = 22;

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
  trophies: { label: 'Trophies', icon: 'trophy-outline' },
  profile: { label: 'Profile', icon: 'person-outline' },
};

/**
 * A floating pill with four icon tabs split around a raised green
 * button. The button logs a round rather than being a tab of its own —
 * adding rounds is the one thing the app should always make easy.
 */
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
        <Ionicons
          name={tab.icon}
          size={25}
          color={focused ? NAV_COLORS.iconActive : NAV_COLORS.icon}
        />
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
        className="flex-row items-center rounded-full px-2"
        style={{
          height: TAB_BAR_HEIGHT,
          backgroundColor: NAV_COLORS.pill,
          borderWidth: 1,
          borderColor: NAV_COLORS.pillEdge,
          boxShadow: '0 14px 32px rgba(0, 0, 0, 0.55)',
        }}
      >
        {renderTab(0)}
        {renderTab(1)}
        <View style={{ width: ACTION_SIZE + 16 }} />
        {renderTab(2)}
        {renderTab(3)}
      </View>

      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 items-center"
        style={{ top: -ACTION_RISE }}
      >
        <Pressable
          className="items-center justify-center rounded-full active:opacity-90"
          style={{
            width: ACTION_SIZE,
            height: ACTION_SIZE,
            backgroundColor: colors.primary,
            boxShadow: `0 0 22px ${NAV_COLORS.glow}, 0 6px 14px rgba(0, 0, 0, 0.45)`,
          }}
          onPress={() => router.push('/log-round')}
          accessibilityRole="button"
          accessibilityLabel="Log a round"
        >
          <Ionicons name="add" size={32} color={colors.primaryForeground} />
        </Pressable>
      </View>
    </View>
  );
}
