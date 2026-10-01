import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { COVERAGE_LEVELS, CoverageLevel } from '@/lib/coverage';

/**
 * Dropdown for the "where I've played" shading level. The menu opens in a
 * transparent modal anchored under the button, so it floats above the globe
 * and a tap anywhere else closes it.
 */
export function CoveragePicker({
  value,
  onChange,
}: {
  value: CoverageLevel;
  onChange: (level: CoverageLevel) => void;
}) {
  const button = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const current = COVERAGE_LEVELS.find((l) => l.id === value) ?? COVERAGE_LEVELS[0];

  const open = () => {
    button.current?.measureInWindow((x, y, _w, h) => setAnchor({ x, y: y + h + 6 }));
  };

  return (
    <>
      <Pressable
        ref={button}
        className="flex-row items-center gap-1.5 self-start rounded-full border border-border bg-card/90 py-1.5 pl-3 pr-2 active:opacity-80"
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`Shade where you've played: ${current.label}`}
        accessibilityState={{ expanded: anchor !== null }}
      >
        <Ionicons name="color-fill-outline" size={13} color={colors.mutedForeground} />
        <Text className="text-xs text-muted-foreground">Played</Text>
        <Text className="font-semibold text-xs text-foreground">{current.label}</Text>
        <Ionicons name="chevron-down" size={13} color={colors.mutedForeground} />
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
              {COVERAGE_LEVELS.map((l) => {
                const active = l.id === value;
                return (
                  <Pressable
                    key={l.id}
                    className={cn(
                      'flex-row items-center justify-between px-3 py-2.5 active:bg-muted',
                      active && 'bg-muted/60'
                    )}
                    onPress={() => {
                      onChange(l.id);
                      setAnchor(null);
                    }}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: active }}
                  >
                    <Text
                      className={cn(
                        'text-sm',
                        active ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {l.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={16} color={colors.primaryBright} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}
