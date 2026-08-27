import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { formatToPar, ScoreBadge } from '@/components/ui/score-badge';
import { StatTile } from '@/components/ui/stat-tile';
import { Text } from '@/components/ui/text';
import { useThemeColors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { aggregateStats } from '@/lib/stats';
import { useAppStore, useCourse } from '@/store/use-app-store';

export default function RoundDetailScreen() {
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const round = useAppStore((s) => s.rounds.find((r) => r.id === id));
  const friends = useAppStore((s) => s.friends);
  const course = useCourse(round?.courseId);

  if (!round) {
    return (
      <View className="flex-1 bg-background p-4">
        <Text>Round not found.</Text>
      </View>
    );
  }

  const stats = aggregateStats([round]);
  const partners = round.playedWith
    .map((fid) => friends.find((f) => f.id === fid))
    .filter((f) => f !== undefined);

  const holeCount = round.holesPlayed;
  const pars = course?.holePars?.slice(0, holeCount);
  const holes = Array.from({ length: holeCount }, (_, i) => ({
    number: i + 1,
    par: pars?.[i],
    score: round.holeScores?.[i]?.strokes,
  }));
  const front = holes.slice(0, 9);
  const back = holes.slice(9);

  const pct = (hit: number, chances: number) =>
    chances ? `${Math.round((hit / chances) * 100)}%` : '—';

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ title: 'Round Details' }} />
      <ScrollView contentContainerClassName="gap-4 p-4">
        {/* Summary card */}
        <View className="flex-row items-center gap-3 rounded-xl bg-card p-4">
          {round.photos[0] ? (
            <Image source={{ uri: round.photos[0] }} style={{ width: 72, height: 72, borderRadius: 12 }} />
          ) : (
            <View className="h-[72px] w-[72px] items-center justify-center rounded-xl bg-elevated">
              <Ionicons name="golf-outline" size={26} color={colors.mutedForeground} />
            </View>
          )}
          <View className="flex-1">
            <Text className="font-semibold text-base">{course?.name ?? 'Unknown course'}</Text>
            <Text className="text-xs text-muted-foreground">{round.date}</Text>
            <Text className="text-xs text-muted-foreground">
              {holeCount} holes{course ? ` · Par ${course.par}` : ''}
            </Text>
          </View>
          <View className="items-end">
            <Text className="font-bold text-3xl text-primary">{round.score ?? '—'}</Text>
            <ScoreBadge toPar={round.toPar} />
          </View>
        </View>

        {/* Playing partners */}
        {partners.length > 0 && (
          <View className="rounded-xl bg-card p-4">
            <Text className="font-semibold text-sm">Played With</Text>
            <View className="mt-3 flex-row gap-4">
              {partners.map((f) => (
                <View key={f.id} className="items-center gap-1">
                  <View
                    className="h-11 w-11 items-center justify-center rounded-full"
                    style={{ backgroundColor: f.avatarColor }}
                  >
                    <Text className="font-bold text-sm" style={{ color: colors.primaryForeground }}>
                      {f.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <Text className="text-xs">{f.name}</Text>
                  {f.handicap !== undefined && (
                    <Text className="text-xs text-muted-foreground">{f.handicap}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Scorecard */}
        <View className="rounded-xl bg-card p-4">
          <Text className="font-semibold text-base">Scorecard</Text>
          {!round.holeScores?.length ? (
            <Text className="mt-2 text-sm text-muted-foreground">
              No hole-by-hole detail on this round.
            </Text>
          ) : (
            <View className="mt-3 gap-4">
              <ScorecardBlock holes={front} label="OUT" />
              {back.length > 0 && <ScorecardBlock holes={back} label="IN" />}
            </View>
          )}
        </View>

        {/* Round stats */}
        <View className="flex-row gap-2">
          <StatTile
            label="Fairways"
            value={pct(stats.fairwaysHit, stats.fairwayChances)}
            delta={`${stats.fairwaysHit} / ${stats.fairwayChances}`}
          />
          <StatTile
            label="GIR"
            value={pct(stats.greensInRegulation, stats.girChances)}
            delta={`${stats.greensInRegulation} / ${stats.girChances}`}
          />
          <StatTile
            label="Putts"
            value={stats.holesWithPutts ? String(stats.putts) : '—'}
            delta={stats.holesWithPutts ? `${(stats.putts / stats.holesWithPutts).toFixed(2)} per hole` : undefined}
          />
        </View>

        {(round.occasion || round.tags.length > 0) && (
          <View className="rounded-xl bg-card p-4">
            <Text className="font-semibold text-sm">Occasion</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              {[round.occasion, ...round.tags.map((t) => `#${t}`)].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}

        {round.notes ? (
          <View className="rounded-xl bg-card p-4">
            <Text className="font-semibold text-sm">Round Notes</Text>
            <Text className="mt-1 text-sm text-muted-foreground">{round.notes}</Text>
          </View>
        ) : null}

        {round.photos.length > 1 && (
          <View className="flex-row flex-wrap gap-2">
            {round.photos.slice(1).map((uri) => (
              <Image key={uri} source={{ uri }} style={{ width: 80, height: 80, borderRadius: 10 }} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

type HoleRow = { number: number; par?: number; score?: number };

/** One nine of the scorecard: hole numbers, pars, scores and the sub-total. */
function ScorecardBlock({ holes, label }: { holes: HoleRow[]; label: string }) {
  const parTotal = holes.reduce((s, h) => s + (h.par ?? 0), 0);
  const scoreTotal = holes.reduce((s, h) => s + (h.score ?? 0), 0);

  return (
    <View className="overflow-hidden rounded-lg border border-border">
      <Row
        cells={[...holes.map((h) => String(h.number)), label]}
        header
        label="HOLE"
      />
      <Row cells={[...holes.map((h) => (h.par ? String(h.par) : '–')), parTotal ? String(parTotal) : '–']} label="PAR" />
      <Row
        cells={[...holes.map((h) => (h.score ? String(h.score) : '–')), scoreTotal ? String(scoreTotal) : '–']}
        label="SCORE"
        tone={holes.map((h) => (h.score && h.par ? h.score - h.par : undefined))}
      />
      <Row
        cells={[
          ...holes.map((h) => (h.score && h.par ? formatToPar(h.score - h.par) : '–')),
          '',
        ]}
        label="TO PAR"
        muted
      />
    </View>
  );
}

function Row({
  cells,
  label,
  header,
  muted,
  tone,
}: {
  cells: string[];
  label: string;
  header?: boolean;
  muted?: boolean;
  tone?: (number | undefined)[];
}) {
  return (
    <View className={cn('flex-row', header ? 'bg-elevated' : 'bg-transparent')}>
      <View className="w-16 justify-center px-2 py-1.5">
        <Text className="text-[10px] text-muted-foreground">{label}</Text>
      </View>
      {cells.map((c, i) => {
        const t = tone?.[i];
        return (
          <View key={i} className="flex-1 items-center justify-center py-1.5">
            <Text
              className={cn(
                'text-[11px]',
                header && 'font-semibold text-foreground',
                muted && 'text-muted-foreground',
                !header && !muted && 'text-foreground',
                t !== undefined && t < 0 && 'font-bold text-primary'
              )}
            >
              {c}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
