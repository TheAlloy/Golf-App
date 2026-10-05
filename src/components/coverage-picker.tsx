import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { COVERAGE_LEVELS, CoverageLevel, coverageNote } from '@/lib/coverage';

/** Diameter of the round trigger; matches the map thumbnail beside the toggle. */
const BUTTON_SIZE = 46;

/**
 * Round filter button for the "where I've played" shading level. The menu
 * opens in a transparent modal anchored under the button, so it floats above
 * the globe and a tap anywhere else closes it. The icon lights up while a
 * level is on.
 */
export function CoveragePicker({
  value,
  onChange,
  size = BUTTON_SIZE,
}: {
  value: CoverageLevel;
  onChange: (level: CoverageLevel) => void;
  size?: number;
}) {
  const button = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const current = COVERAGE_LEVELS.find((l) => l.id === value) ?? COVERAGE_LEVELS[0];
  const active = value !== 'off';
  const note = coverageNote(value);

  const open = () => {
    button.current?.measureInWindow((x, y, _w, h) => setAnchor({ x, y: y + h + 6 }));
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
        accessibilityLabel={`Shade where you've played: ${current.label}`}
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
              className="absolute w-48 overflow-hidden rounded-xl border border-border bg-elevated py-1"
              style={{
                left: anchor.x,
                top: anchor.y,
                boxShadow: '0 12px 32px rgba(0, 0, 0, 0.55)',
              }}
              accessibilityRole="menu"
            >
              <Text className="px-3 pb-1 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                Shade where you&apos;ve played
              </Text>
              {COVERAGE_LEVELS.map((l) => {
                const selected = l.id === value;
                return (
                  <Pressable
                    key={l.id}
                    className={cn(
                      'flex-row items-center justify-between px-3 py-3 active:bg-muted',
                      selected && 'bg-muted/60'
                    )}
                    onPress={() => {
                      onChange(l.id);
                      setAnchor(null);
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected }}
                  >
                    <Text
                      className={cn(
                        'text-sm',
                        selected ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {l.label}
                    </Text>
                    {selected && (
                      <Ionicons name="checkmark" size={16} color={colors.primaryBright} />
                    )}
                  </Pressable>
                );
              })}
              {note && (
                <Text className="px-3 pb-2 pt-1 text-[10px] text-muted-foreground">{note}</Text>
              )}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}
