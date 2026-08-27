import { Ionicons } from '@expo/vector-icons';
import { ScrollView, View } from 'react-native';

import { ScoreBadge } from '@/components/ui/score-badge';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/constants/theme';
import { aggregateStats } from '@/lib/stats';
import { useAppStore, useCourses } from '@/store/use-app-store';

export default function StatsScreen() {
  const colors = useThemeColors();
  const rounds = useAppStore((s) => s.rounds);
  const courses = useCourses(rounds.map((r) => r.courseId));
  const stats = aggregateStats(rounds);

  const scored = rounds.filter((r) => r.score !== undefined);
  const best = scored.reduce<(typeof scored)[number] | undefined>(
    (b, r) => (b === undefined || (r.toPar ?? 99) < (b.toPar ?? 99) ? r : b),
    undefined
  );

  const pct = (hit: number, chances: number) => (chances ? `${Math.round((hit / chances) * 100)}%` : '—');

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-4 p-4 pt-16">
        <Text className="font-bold text-3xl text-foreground">Stats</Text>

        <View className="flex-row gap-2">
          <StatTile label="Rounds" value={String(rounds.length)} />
          <StatTile
            label="Avg Score"
            value={scored.length ? (scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length).toFixed(1) : '—'}
          />
          <StatTile label="Best" value={best?.score !== undefined ? String(best.score) : '—'} />
        </View>

        <View className="rounded-xl bg-card p-4">
          <Text className="font-semibold text-base">Shot quality</Text>
          <Text className="mt-1 text-xs text-muted-foreground">
            From the hole-by-hole scorecards you have filled in.
          </Text>

          <View className="mt-3 flex-row gap-2">
            <StatTile
              className="bg-elevated"
              label="Fairways"
              value={pct(stats.fairwaysHit, stats.fairwayChances)}
              delta={`${stats.fairwaysHit} / ${stats.fairwayChances}`}
              icon={<Ionicons name="golf-outline" size={14} color={colors.primary} />}
            />
            <StatTile
              className="bg-elevated"
              label="GIR"
              value={pct(stats.greensInRegulation, stats.girChances)}
              delta={`${stats.greensInRegulation} / ${stats.girChances}`}
              icon={<Ionicons name="disc-outline" size={14} color={colors.info} />}
            />
            <StatTile
              className="bg-elevated"
              label="Putts"
              value={stats.holesWithPutts ? (stats.putts / stats.holesWithPutts).toFixed(2) : '—'}
              delta="per hole"
              icon={<Ionicons name="ellipse-outline" size={14} color={colors.warm} />}
            />
          </View>

          {stats.fairwayChances === 0 && stats.girChances === 0 && (
            <Text className="mt-3 text-sm text-muted-foreground">
              No scorecards yet. Add hole-by-hole detail when logging a round to see these.
            </Text>
          )}
        </View>

        <View className="rounded-xl bg-card p-4">
          <Text className="font-semibold text-base">Best rounds</Text>
          {scored.length === 0 ? (
            <Text className="mt-2 text-sm text-muted-foreground">Nothing scored yet.</Text>
          ) : (
            [...scored]
              .sort((a, b) => (a.toPar ?? 99) - (b.toPar ?? 99))
              .slice(0, 5)
              .map((r) => (
                <View key={r.id} className="flex-row items-center justify-between border-b border-border py-3">
                  <View className="flex-1">
                    <Text className="text-sm">{courses.get(r.courseId)?.name ?? 'Unknown course'}</Text>
                    <Text className="text-xs text-muted-foreground">{r.date}</Text>
                  </View>
                  <View className="flex-row items-baseline gap-2">
                    <Text className="font-bold text-lg text-foreground">{r.score}</Text>
                    <ScoreBadge toPar={r.toPar} />
                  </View>
                </View>
              ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
