import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { girForHole } from '@/lib/stats';
import { HoleScore } from '@/models/types';

type Props = {
  holes: number;
  /** Par per hole from the course, when known. */
  pars?: number[];
  value: HoleScore[];
  onChange: (next: HoleScore[]) => void;
};

/**
 * Hole-by-hole entry. Strokes and putts step rather than using a keyboard,
 * which is what you want tapping through a card. Greens in regulation are
 * derived from strokes, putts and par rather than asked for.
 */
export default function ScorecardEntry({ holes, pars, value, onChange }: Props) {
  const update = (index: number, patch: Partial<HoleScore>) => {
    const next = [...value];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const bump = (index: number, field: 'strokes' | 'putts', delta: number, par?: number) => {
    const current = value[index]?.[field];
    const fallback = field === 'strokes' ? (par ?? 4) : 2;
    const raw = (current ?? fallback) + delta;
    update(index, { [field]: Math.max(field === 'strokes' ? 1 : 0, Math.min(15, raw)) });
  };

  return (
    <View className="gap-2">
      {Array.from({ length: holes }, (_, i) => {
        const par = pars?.[i];
        const hole = value[i] ?? {};
        const isPar3 = par === 3;
        const gir = girForHole(hole, par);
        const over = hole.strokes !== undefined && par !== undefined ? hole.strokes - par : undefined;

        return (
          <View key={i} className="rounded-lg bg-elevated p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-baseline gap-2">
                <Text className="font-bold text-sm text-foreground">Hole {i + 1}</Text>
                {par ? <Text className="text-xs text-muted-foreground">Par {par}</Text> : null}
              </View>
              <View className="flex-row items-center gap-2">
                {gir && (
                  <View className="rounded-full bg-primary/20 px-2 py-0.5">
                    <Text className="text-[10px] text-primary">GIR</Text>
                  </View>
                )}
                {over !== undefined && (
                  <Text
                    className={cn(
                      'font-semibold text-xs',
                      over < 0 && 'text-primary',
                      over === 0 && 'text-muted-foreground',
                      over > 0 && 'text-info'
                    )}
                  >
                    {over === 0 ? 'Par' : over > 0 ? `+${over}` : String(over)}
                  </Text>
                )}
              </View>
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

            <View className="mt-2 flex-row items-center gap-2">
              {!isPar3 ? (
                <Toggle
                  label="Fairway hit"
                  active={hole.fairwayHit === true}
                  onPress={() => update(i, { fairwayHit: !hole.fairwayHit })}
                />
              ) : (
                <Text className="text-xs text-muted-foreground">No fairway on a par 3</Text>
              )}
              {hole.strokes !== undefined && (
                <Pressable
                  className="ml-auto flex-row items-center gap-1 px-2 py-1"
                  onPress={() =>
                    update(i, { strokes: undefined, putts: undefined, fairwayHit: undefined })
                  }
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
        <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-card" onPress={onUp}>
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
        'flex-row items-center gap-1.5 rounded-full border px-3 py-1',
        active ? 'border-primary bg-primary' : 'border-border bg-transparent'
      )}
      onPress={onPress}
    >
      <Ionicons
        name={active ? 'checkmark-circle' : 'ellipse-outline'}
        size={13}
        color={active ? colors.primaryForeground : colors.mutedForeground}
      />
      <Text className={cn('text-xs', active ? 'text-primary-foreground' : 'text-muted-foreground')}>
        {label}
      </Text>
    </Pressable>
  );
}
