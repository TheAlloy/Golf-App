import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NAV_COLORS } from '@/constants/theme';

/** Height of the floating pill. */
export const TAB_BAR_HEIGHT = 64;
/**
 * Inset of the selected-slot pill from the bar's edges, on every side: the
 * bar's horizontal padding matches it, so the pill sits as far from the ends
 * of the bar as from its top and bottom.
 */
const PILL_INSET = 8;
const ACTIVE_HEIGHT = TAB_BAR_HEIGHT - PILL_INSET * 2;
/** How far the pill stretches while in flight, as a multiple of its width. */
const STRETCH = 1.35;

/** Gap between the pill and the bottom of the screen, on the 4px grid. */
export function barOffset(bottomInset: number): number {
  // Sit just above the home indicator, or a little off the edge without one.
  return Math.max(Math.ceil((bottomInset - 8) / 4) * 4, 16);
}

/** Space a screen should leave at the bottom so content clears the bar. */
export function useTabBarSpace(): number {
  return barOffset(useSafeAreaInsets().bottom) + TAB_BAR_HEIGHT + 8;
}

export type IconName = keyof typeof Ionicons.glyphMap;

/**
 * The liquid move shared by every segmented control: `slot` springs to the
 * selected index while `stretch` swells sideways and settles back, so the
 * selected pill reads as a drop of liquid moving rather than a swap. Both
 * drive transforms, so they run on the native driver. Under reduce-motion
 * the pill snaps instead.
 */
export function useLiquidSlot(target: number): { slot: Animated.Value; stretch: Animated.Value } {
  const [slot] = useState(() => new Animated.Value(target));
  const [stretch] = useState(() => new Animated.Value(1));
  const reduceMotion = useRef(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => live && (reduceMotion.current = on))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (reduceMotion.current) {
      slot.setValue(target);
      return;
    }
    stretch.stopAnimation();
    Animated.parallel([
      Animated.spring(slot, {
        toValue: target,
        stiffness: 170,
        damping: 18,
        mass: 0.9,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(stretch, { toValue: STRETCH, duration: 110, useNativeDriver: true }),
        Animated.spring(stretch, {
          toValue: 1,
          stiffness: 220,
          damping: 16,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [target, slot, stretch]);
  return { slot, stretch };
}

export type PillSlot = {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  /** Tabs take the selected pill; buttons act without moving it. */
  role?: 'tab' | 'button';
  /** Overrides the icon colour, for a slot that signals state. */
  color?: string;
  /** Drawn over the icon's corner: a live dot, a count. */
  badge?: ReactNode;
};

type Props = {
  slots: PillSlot[];
  /** Index into slots of the selected tab. */
  activeSlot: number;
};

/**
 * A floating bar of evenly spaced icons with one darker pill behind the
 * selected slot. The pill is a single element that glides between slots,
 * stretching as it goes and settling back, so a change reads as a drop of
 * liquid moving rather than a swap. Home's tab bar and the live round's bar
 * are both this.
 */
export function LiquidPillBar({ slots, activeSlot }: Props) {
  const insets = useSafeAreaInsets();
  const count = slots.length;

  const [slotWidth, setSlotWidth] = useState(0);
  const { slot, stretch } = useLiquidSlot(activeSlot);

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
          paddingHorizontal: PILL_INSET - 1,
          backgroundColor: NAV_COLORS.pill,
          borderWidth: 1,
          borderColor: NAV_COLORS.pillEdge,
          boxShadow: '0 14px 32px rgba(0, 0, 0, 0.55)',
        }}
        onLayout={(e) => setSlotWidth((e.nativeEvent.layout.width - PILL_INSET * 2) / count)}
      >
        {/* The liquid pill, behind the icons. */}
        {slotWidth > 0 && count > 1 && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              // The bar's 1px border sits outside its padding box, so these
              // put the pill 8px from the bar's outer edge on every side.
              left: PILL_INSET - 1,
              top: PILL_INSET - 1,
              width: slotWidth,
              height: ACTIVE_HEIGHT,
              borderRadius: ACTIVE_HEIGHT / 2,
              backgroundColor: NAV_COLORS.active,
              transform: [
                {
                  translateX: slot.interpolate({
                    inputRange: [0, count - 1],
                    outputRange: [0, slotWidth * (count - 1)],
                  }),
                },
                { scaleX: stretch },
              ],
            }}
          />
        )}
        {slots.map((s, i) => {
          const isTab = (s.role ?? 'tab') === 'tab';
          const focused = isTab && i === activeSlot;
          return (
            <Pressable
              key={s.key}
              className="flex-1 items-center justify-center active:opacity-70"
              onPress={s.onPress}
              accessibilityRole={isTab ? 'tab' : 'button'}
              accessibilityState={isTab ? { selected: focused } : undefined}
              accessibilityLabel={s.label}
              hitSlop={4}
            >
              <View
                className="items-center justify-center self-stretch"
                style={{ height: ACTIVE_HEIGHT }}
              >
                <Ionicons
                  name={s.icon}
                  size={25}
                  color={s.color ?? (focused ? NAV_COLORS.iconActive : NAV_COLORS.icon)}
                />
                {s.badge}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
