import { Text } from '@/components/ui/text';
import { cn } from '@/lib/cn';

/** Renders a to-par figure the way a scorecard does: E, -1, +3. */
export function formatToPar(toPar: number | undefined): string {
  if (toPar === undefined) return '—';
  if (toPar === 0) return 'E';
  return toPar > 0 ? `+${toPar}` : String(toPar);
}

export function ScoreBadge({ toPar, className }: { toPar?: number; className?: string }) {
  const tone =
    toPar === undefined
      ? 'text-muted-foreground'
      : toPar < 0
        ? 'text-primary'
        : toPar === 0
          ? 'text-info'
          : 'text-info';
  return <Text className={cn('font-semibold text-sm', tone, className)}>{formatToPar(toPar)}</Text>;
}
