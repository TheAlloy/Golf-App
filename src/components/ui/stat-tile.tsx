import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

type Props = {
  label: string;
  value: string;
  /** Small note under the value, e.g. "+12 this year". */
  delta?: string;
  deltaTone?: 'primary' | 'info' | 'muted';
  icon?: React.ReactNode;
  className?: string;
};

export function StatTile({ label, value, delta, deltaTone = 'muted', icon, className }: Props) {
  return (
    <View className={cn('flex-1 rounded-xl bg-card p-3', className)}>
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-muted-foreground">{label}</Text>
        {icon}
      </View>
      <Text className="mt-1 font-bold text-2xl text-foreground">{value}</Text>
      {delta ? (
        <Text
          className={cn(
            'text-xs',
            deltaTone === 'primary' && 'text-primary',
            deltaTone === 'info' && 'text-info',
            deltaTone === 'muted' && 'text-muted-foreground'
          )}
        >
          {delta}
        </Text>
      ) : null}
    </View>
  );
}
