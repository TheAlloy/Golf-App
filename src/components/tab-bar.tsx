import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

/** Height of the bar above the home-indicator inset. */
export const TAB_BAR_HEIGHT = 64;

/** Space a screen should leave at the bottom so content clears the tab bar. */
export function useTabBarSpace(): number {
  return useSafeAreaInsets().bottom + TAB_BAR_HEIGHT;
}

type IconName = keyof typeof Ionicons.glyphMap;

const TABS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  index: { label: 'Home', icon: 'earth-outline', iconActive: 'earth' },
  explore: { label: 'Explore', icon: 'compass-outline', iconActive: 'compass' },
  trophies: { label: 'Trophies', icon: 'trophy-outline', iconActive: 'trophy' },
  profile: { label: 'Profile', icon: 'person-outline', iconActive: 'person' },
};

/**
 * Four tabs split around a raised centre button. The button logs a round
 * rather than being a tab of its own — adding rounds is the one thing the
 * app should always make easy.
 */
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const renderTab = (index: number) => {
    const route = state.routes[index];
    const tab = TABS[route.name];
    if (!route || !tab) return null;
    const focused = state.index === index;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
    };
    return (
      <Pressable
        key={route.key}
        className="flex-1 items-center justify-center gap-1"
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={tab.label}
      >
        <Ionicons
          name={focused ? tab.iconActive : tab.icon}
          size={22}
          color={focused ? colors.primary : colors.mutedForeground}
        />
        <Text
          className="font-medium text-[10px]"
          style={{ color: focused ? colors.primary : colors.mutedForeground }}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      className="absolute inset-x-0 bottom-0 flex-row border-t border-border"
      style={{
        height: TAB_BAR_HEIGHT + insets.bottom,
        paddingBottom: insets.bottom,
        backgroundColor: colors.card,
      }}
    >
      {renderTab(0)}
      {renderTab(1)}
      <View className="w-20 items-center">
        <Pressable
          className="h-16 w-16 items-center justify-center rounded-full border-4 border-background bg-primary active:opacity-90"
          style={{ marginTop: -22 }}
          onPress={() => router.push('/log-round')}
          accessibilityLabel="Log a round"
        >
          <Ionicons name="add" size={30} color={colors.primaryForeground} />
        </Pressable>
      </View>
      {renderTab(2)}
      {renderTab(3)}
    </View>
  );
}
