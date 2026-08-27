import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { HoleScore } from '@/models/types';

type Props = {
  holes: number;
  /** Par per hole from the course, when known — drives the GIR calculation. */
  pars?: number[];
  value: HoleScore[];
  onChange: (next: HoleScore[]) => void;
};

/**
 * Hole-by-hole entry. Strokes and putts step up and down rather than using a
 * keyboard, which is what you want when tapping through a card on the course.
 * Fairway is skipped on par 3s, where there is no fairway to hit.
 */
export default function ScorecardEntry({ holes, pars, value, onChange }: Props) {
  const colors = useThemeColors();

  const update = (index: number, patch: Partial<HoleScore>) => {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const bump = (index: number, field: 'strokes' | 'putts', delta: number, par?: number) => {
    const current = value[index]?.[field];
    const fallback = field === 'strokes' ? (par ?? 4) : 2;
    const raw = (current ?? fallback) + delta;
    const min = field === 'strokes' ? 1 : 0;
    update(index, { [field]: Math.max(min, Math.min(15, raw)) });
  };

  return (
    <ScrollView horizontal={false} className="max-h-[420px]">
      <View className="gap-2">
        {Array.from({ length: holes }, (_, i) => {
          const par = pars?.[i];
          const hole = value[i] ?? {};
          const isPar3 = par === 3;
          // Green in regulation: on the green with two putts left to make par.
          const girAuto =
            hole.strokes !== undefined && hole.putts !== undefined && par !== undefined
              ? hole.strokes - hole.putts <= par - 2
              : undefined;

          return (
            <View key={i} className="rounded-lg bg-elevated p-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-baseline gap-2">
                  <Text className="font-bold text-sm text-foreground">Hole {i + 1}</Text>
                  {par ? <Text className="text-xs text-muted-foreground">Par {par}</Text> : null}
                </View>
                {hole.strokes !== undefined && par !== undefined && (
                  <Text
                    className={cn(
                      'font-semibold text-xs',
                      hole.strokes - par < 0 && 'text-primary',
                      hole.strokes - par === 0 && 'text-muted-foreground',
                      hole.strokes - par > 0 && 'text-info'
                    )}
                  >
                    {hole.strokes - par === 0
                      ? 'Par'
                      : hole.strokes - par > 0
                        ? `+${hole.strokes - par}`
                        : String(hole.strokes - par)}
                  </Text>
                )}
              </View>

              <View className="mt-2 flex-row items-center gap-4">
                <Stepper
                  label="Score"
                  value={hole.strokes}
                  onDown={() => bump(i, 'strokes', -1, par)}
                  onUp={() => bump(i, 'strokes', 1, par)}
                />
                <Stepper
                  label="Putts"
                  value={hole.putts}
                  onDown={() => bump(i, 'putts', -1)}
                  onUp={() => bump(i, 'putts', 1)}
                />
              </View>

              <View className="mt-2 flex-row gap-2">
                {!isPar3 && (
                  <Toggle
                    label="Fairway"
                    active={hole.fairwayHit === true}
                    onPress={() => update(i, { fairwayHit: !hole.fairwayHit })}
                  />
                )}
                <Toggle
                  label="GIR"
                  active={hole.gir ?? girAuto ?? false}
                  onPress={() => update(i, { gir: !(hole.gir ?? girAuto ?? false) })}
                />
                {hole.strokes !== undefined && (
                  <Pressable
                    className="ml-auto flex-row items-center gap-1 px-2 py-1"
                    onPress={() => update(i, { strokes: undefined, putts: undefined, fairwayHit: undefined, gir: undefined })}
                  >
                    <Ionicons name="close-circle" size={14} color={colors.mutedForeground} />
                    <Text className="text-xs text-muted-foreground">Clear</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Stepper({
  label,
  value,
  onDown,
  onUp,
}: {
  label: string;
  value?: number;
  onDown: () => void;
  onUp: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View className="flex-1">
      <Text className="text-xs text-muted-foreground">{label}</Text>
      <View className="mt-1 flex-row items-center gap-3">
        <Pressable
          className="h-8 w-8 items-center justify-center rounded-full bg-card"
          onPress={onDown}
        >
          <Ionicons name="remove" size={16} color={colors.foreground} />
        </Pressable>
        <Text className="min-w-6 text-center font-bold text-base text-foreground">
          {value ?? '–'}
        </Text>
        <Pressable
          className="h-8 w-8 items-center justify-center rounded-full bg-card"
          onPress={onUp}
        >
          <Ionicons name="add" size={16} color={colors.foreground} />
        </Pressable>
      </View>
    </View>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      className={cn(
        'rounded-full border px-3 py-1',
        active ? 'border-primary bg-primary' : 'border-border bg-transparent'
      )}
      onPress={onPress}
    >
      <Text className={cn('text-xs', active ? 'text-primary-foreground' : 'text-muted-foreground')}>
        {label}
      </Text>
    </Pressable>
  );
}
