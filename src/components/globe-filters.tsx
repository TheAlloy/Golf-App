import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useRef, useState } from 'react';
import { Modal, Pressable, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { COVERAGE_LEVELS, CoverageLevel, coverageNote } from '@/lib/coverage';

/** Diameter of the round trigger; matches the layers button beside the toggle. */
const BUTTON_SIZE = 46;
/** Width of the menu, and the least it keeps from the screen's edge. */
const MENU_WIDTH = 256;
const MENU_MARGIN = 16;

export type GlobeFilterState = {
  /** "Where I've played" shading level. */
  coverage: CoverageLevel;
  played: boolean;
  wishlist: boolean;
  live: boolean;
};

export const DEFAULT_FILTERS: GlobeFilterState = {
  coverage: 'off',
  played: true,
  wishlist: true,
  live: true,
};

/**
 * The funnel button's menu, in three sections: the shading level, the
 * course pins (played and wishlist, each on or off) and live players. It
 * floats under the button and stays open while you flick switches; a tap
 * anywhere else closes it. The funnel fills while anything is off default.
 */
export function GlobeFilters({
  value,
  onChange,
  liveCount,
  shadingAvailable,
  size = BUTTON_SIZE,
}: {
  value: GlobeFilterState;
  onChange: (next: GlobeFilterState) => void;
  /** How many people are out playing, for the live players row. */
  liveCount: number;
  /** Shading is drawn by the vector map only. */
  shadingAvailable: boolean;
  size?: number;
}) {
  const button = useRef<View>(null);
  const { width } = useWindowDimensions();
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const active = value.coverage !== 'off' || !value.played || !value.wishlist || !value.live;
  const note = coverageNote(value.coverage);
  const set = (patch: Partial<GlobeFilterState>) => onChange({ ...value, ...patch });

  const open = () => {
    // Under the button, but kept on screen: it's wider than the room to its right.
    button.current?.measureInWindow((x, y, _w, h) =>
      setAnchor({
        x: Math.max(MENU_MARGIN, Math.min(x, width - MENU_WIDTH - MENU_MARGIN)),
        y: y + h + 6,
      })
    );
  };

  return (
    <>
      <Pressable
        ref={button}
        className={cn(
          'items-center justify-center rounded-full border active:opacity-80',
          active ? 'border-primary bg-primary' : 'border-border bg-card/90'
        )}
        style={{ width: size, height: size }}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel="Filters"
        accessibilityState={{ expanded: anchor !== null }}
      >
        <Ionicons
          name={active ? 'funnel' : 'funnel-outline'}
          size={18}
          color={active ? colors.primaryForeground : colors.mutedForeground}
        />
      </Pressable>

      <Modal
        visible={anchor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAnchor(null)}
      >
        <Pressable className="flex-1" onPress={() => setAnchor(null)} accessibilityLabel="Close">
          {anchor && (
            <View
              className="absolute overflow-hidden rounded-2xl border border-border bg-elevated pb-1"
              style={{
                width: MENU_WIDTH,
                left: anchor.x,
                top: anchor.y,
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
              }}
              accessibilityRole="menu"
            >
              <Section title="Shaded areas">
                {shadingAvailable ? (
                  <>
                    {COVERAGE_LEVELS.map((l) => {
                      const selected = l.id === value.coverage;
                      return (
                        <Row
                          key={l.id}
                          label={l.label}
                          selected={selected}
                          onPress={() => set({ coverage: l.id })}
                          accessibilityRole="radio"
                          accessibilityState={{ checked: selected }}
                          trailing={
                            <Ionicons
                              name={selected ? 'radio-button-on' : 'radio-button-off'}
                              size={18}
                              color={selected ? colors.primaryBright : colors.mutedForeground}
                            />
                          }
                        />
                      );
                    })}
                    {note && (
                      <Text className="px-4 pb-1 text-[10px] text-muted-foreground">{note}</Text>
                    )}
                  </>
                ) : (
                  <Text className="px-4 pb-2 text-xs text-muted-foreground">
                    Switch to the Map look to shade where you&apos;ve played.
                  </Text>
                )}
              </Section>

              <Section title="Courses">
                <Row
                  label="Played"
                  dot={colors.primaryBright}
                  selected={value.played}
                  onPress={() => set({ played: !value.played })}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: value.played }}
                  trailing={<Toggle on={value.played} />}
                />
                <Row
                  label="Wishlist"
                  dot="hsl(68, 92%, 60%)"
                  selected={value.wishlist}
                  onPress={() => set({ wishlist: !value.wishlist })}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: value.wishlist }}
                  trailing={<Toggle on={value.wishlist} />}
                />
              </Section>

              <Section title="Live players" last>
                <Row
                  label={liveCount ? `Playing now · ${liveCount}` : 'Playing now'}
                  dot={colors.info}
                  selected={value.live}
                  onPress={() => set({ live: !value.live })}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: value.live }}
                  trailing={<Toggle on={value.live} />}
                />
                {liveCount === 0 && (
                  <Text className="px-4 pb-1 text-[10px] text-muted-foreground">
                    Nobody&apos;s out at the moment.
                  </Text>
                )}
              </Section>
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

function Section({
  title,
  last,
  children,
}: {
  title: string;
  last?: boolean;
  children: ReactNode;
}) {
  return (
    <View className={cn(!last && 'border-border border-b pb-1')}>
      <Text className="px-4 pb-1 pt-3 text-[10px] uppercase tracking-wide text-muted-foreground">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({
  label,
  dot,
  selected,
  onPress,
  trailing,
  accessibilityRole,
  accessibilityState,
}: {
  label: string;
  dot?: string;
  selected: boolean;
  onPress: () => void;
  trailing: ReactNode;
  accessibilityRole: 'switch' | 'radio';
  accessibilityState: { checked: boolean };
}) {
  return (
    <Pressable
      className="flex-row items-center gap-3 px-4 py-2 active:bg-muted"
      onPress={onPress}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      accessibilityLabel={label}
    >
      {dot && (
        <View
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: dot, opacity: selected ? 1 : 0.35 }}
        />
      )}
      <Text
        className={cn(
          'flex-1 text-sm',
          selected ? 'font-semibold text-foreground' : 'text-muted-foreground'
        )}
      >
        {label}
      </Text>
      {trailing}
    </Pressable>
  );
}

/** A small switch track, drawn so it looks the same everywhere. */
function Toggle({ on }: { on: boolean }) {
  return (
    <View
      className="h-6 w-10 justify-center rounded-full p-0.5"
      style={{ backgroundColor: on ? colors.primaryBright : colors.muted }}
    >
      <View
        className="h-5 w-5 rounded-full bg-white"
        style={{ alignSelf: on ? 'flex-end' : 'flex-start' }}
      />
    </View>
  );
}
