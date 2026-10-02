import { useRef } from 'react';
import { TextInput, View } from 'react-native';

import { Text, withFontFamily } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { HoleScore } from '@/models/types';

type Props = {
  holes: number;
  pars?: (number | undefined)[];
  value: HoleScore[];
  onChange: (next: HoleScore[]) => void;
};

/**
 * Type the card in: a row of boxes per nine, one per hole, moving to the
 * next hole as soon as a score is typed. Putts and fairways stay in the
 * detailed list below; this is for getting the numbers down quickly.
 */
export default function ScorecardQuickEntry({ holes, pars, value, onChange }: Props) {
  const inputs = useRef<(TextInput | null)[]>([]);

  const setStrokes = (index: number, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(-2);
    const n = Number(digits);
    const next = [...value];
    next[index] = {
      ...next[index],
      strokes: digits && n >= 1 && n <= 15 ? n : undefined,
    };
    onChange(next);
    // A leading 1 may become 10–15; anything else is a whole score, so move on.
    if (digits && digits !== '1' && index + 1 < holes) inputs.current[index + 1]?.focus();
  };

  const nines = Array.from({ length: Math.ceil(holes / 9) }, (_, n) => n);
  return (
    <View className="gap-2">
      {nines.map((n) => {
        const start = n * 9;
        const count = Math.min(9, holes - start);
        const subtotal = value
          .slice(start, start + count)
          .reduce((sum, h) => sum + (h?.strokes ?? 0), 0);
        return (
          <View key={n} className="gap-1">
            <View className="flex-row items-center gap-1">
              {Array.from({ length: count }, (_, i) => {
                const index = start + i;
                const strokes = value[index]?.strokes;
                const par = pars?.[index];
                const over = strokes !== undefined && par !== undefined ? strokes - par : undefined;
                return (
                  <View key={index} className="flex-1 items-center gap-1">
                    <Text className="text-[10px] text-muted-foreground">{index + 1}</Text>
                    <TextInput
                      ref={(el) => {
                        inputs.current[index] = el;
                      }}
                      className={withFontFamily(
                        cn(
                          'h-10 w-full rounded-md border bg-background text-center font-semibold text-base text-foreground',
                          over === undefined && 'border-input',
                          over !== undefined && over < 0 && 'border-primary-bright',
                          over !== undefined && over === 0 && 'border-border',
                          over !== undefined && over > 0 && 'border-info/60'
                        )
                      )}
                      value={strokes === undefined ? '' : String(strokes)}
                      onChangeText={(t) => setStrokes(index, t)}
                      keyboardType="number-pad"
                      maxLength={2}
                      selectTextOnFocus
                      placeholder={par ? String(par) : '–'}
                      placeholderTextColor={colors.muted}
                      accessibilityLabel={`Hole ${index + 1} score`}
                    />
                  </View>
                );
              })}
              <View className="w-9 items-center gap-1">
                <Text className="text-[10px] text-muted-foreground">{n === 0 ? 'Out' : 'In'}</Text>
                <View className="h-10 w-full items-center justify-center">
                  <Text className="font-bold text-sm text-foreground">
                    {subtotal ? subtotal : '–'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
