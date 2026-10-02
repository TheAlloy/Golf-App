import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';

import { formatToPar } from '@/components/ui/score-badge';
import { Text, withFontFamily } from '@/components/ui/text';
import { colors } from '@/constants/theme';
import { cn } from '@/lib/cn';
import { liveHolePar } from '@/lib/live-round';
import { Course, LivePlayer, LiveRound } from '@/models/types';
import { MAX_LIVE_PLAYERS, useAppStore } from '@/store/use-app-store';

type Props = {
  course: Course;
  live: LiveRound;
  topSpace: number;
  bottomSpace: number;
  onFinish: () => void;
  onDiscard: () => void;
};

/** Scores a hole can take on the picker. */
const PICKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * The live card: holes down the side, up to four players across, every cell
 * a tap away from a score. Out, In and totals keep themselves up to date,
 * and the hole you're on is marked.
 */
export default function LiveScorecard({
  course,
  live,
  topSpace,
  bottomSpace,
  onFinish,
  onDiscard,
}: Props) {
  const setLiveScore = useAppStore((s) => s.setLiveScore);
  const updateLiveRound = useAppStore((s) => s.updateLiveRound);
  const removeLivePlayer = useAppStore((s) => s.removeLivePlayer);
  const [picking, setPicking] = useState<{ player: LivePlayer; hole: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const holes = live.holesPlayed;
  const parOf = (hole: number) => liveHolePar(course, live, hole);
  const strokesOf = (player: LivePlayer, hole: number) => live.scores[player.id]?.[hole - 1];

  const sum = (player: LivePlayer, from: number, to: number) => {
    let total = 0;
    let any = false;
    for (let h = from; h <= to; h++) {
      const s = strokesOf(player, h);
      if (s !== undefined) {
        total += s;
        any = true;
      }
    }
    return any ? total : undefined;
  };
  const parSum = (from: number, to: number, player?: LivePlayer) => {
    // Against the holes actually scored, so a half-finished card still reads right.
    let total = 0;
    for (let h = from; h <= to; h++) {
      if (player && strokesOf(player, h) === undefined) continue;
      total += parOf(h) ?? course.par / course.holes;
    }
    return Math.round(total);
  };

  const pick = (player: LivePlayer, hole: number, strokes: number | undefined) => {
    setLiveScore(player.id, hole, strokes);
    setPicking(null);
  };

  const columns = live.players;

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingTop: topSpace + 8, paddingBottom: bottomSpace + 8 }}
        indicatorStyle="white"
      >
        {/* Players across the top. */}
        <View className="mx-4 mb-2 flex-row items-end">
          <View style={{ width: 72 }}>
            <HolesToggle
              holes={holes}
              onChange={(h) =>
                updateLiveRound({ holesPlayed: h, currentHole: Math.min(live.currentHole, h) })
              }
            />
          </View>
          {columns.map((p) => (
            <Pressable
              key={p.id}
              className="flex-1 items-center gap-1 px-0.5"
              onLongPress={() => p.id !== 'me' && removeLivePlayer(p.id)}
              accessibilityLabel={p.id === 'me' ? p.name : `${p.name}. Hold to remove`}
            >
              <View
                className="h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: p.color }}
              >
                <Text className="font-bold text-xs" style={{ color: colors.background }}>
                  {initials(p.name)}
                </Text>
              </View>
              <Text className="text-[11px] text-foreground" numberOfLines={1}>
                {p.id === 'me' ? 'You' : p.name}
              </Text>
            </Pressable>
          ))}
          {columns.length < MAX_LIVE_PLAYERS && (
            <Pressable
              className="flex-1 items-center gap-1 px-0.5 active:opacity-70"
              onPress={() => setAdding(true)}
              accessibilityRole="button"
              accessibilityLabel="Add a player"
            >
              <View className="h-8 w-8 items-center justify-center rounded-full border border-border border-dashed">
                <Ionicons name="add" size={16} color={colors.mutedForeground} />
              </View>
              <Text className="text-[11px] text-muted-foreground">Add</Text>
            </Pressable>
          )}
        </View>

        <View className="mx-4 overflow-hidden rounded-2xl border border-border bg-card">
          <Row label="Hole" sub="Par" header />
          {Array.from({ length: holes }, (_, i) => i + 1).map((hole) => (
            <View key={hole}>
              <Pressable
                className={cn(
                  'flex-row items-center border-border border-t',
                  hole === live.currentHole && 'bg-elevated'
                )}
                onPress={() => updateLiveRound({ currentHole: hole })}
                accessibilityLabel={`Hole ${hole}${hole === live.currentHole ? ', current' : ''}`}
              >
                <View className="flex-row items-center gap-1" style={{ width: 72 }}>
                  <View className="w-8 items-center">
                    <Text
                      className={cn(
                        'font-bold text-sm',
                        hole === live.currentHole ? 'text-primary-bright' : 'text-foreground'
                      )}
                    >
                      {hole}
                    </Text>
                  </View>
                  <Text className="text-xs text-muted-foreground">{parOf(hole) ?? '–'}</Text>
                </View>
                {columns.map((p) => (
                  <ScoreCell
                    key={p.id}
                    strokes={strokesOf(p, hole)}
                    par={parOf(hole)}
                    color={p.color}
                    onPress={() => setPicking({ player: p, hole })}
                    label={`${p.name}, hole ${hole}`}
                  />
                ))}
                {columns.length < MAX_LIVE_PLAYERS && <View className="flex-1" />}
              </Pressable>
              {hole === 9 && holes === 18 && (
                <TotalsRow
                  label="Out"
                  players={columns}
                  value={(p) => sum(p, 1, 9)}
                  par={(p) => parSum(1, 9, p)}
                  spare={columns.length < MAX_LIVE_PLAYERS}
                />
              )}
            </View>
          ))}
          {holes === 18 && (
            <TotalsRow
              label="In"
              players={columns}
              value={(p) => sum(p, 10, 18)}
              par={(p) => parSum(10, 18, p)}
              spare={columns.length < MAX_LIVE_PLAYERS}
            />
          )}
          <TotalsRow
            label="Total"
            players={columns}
            value={(p) => sum(p, 1, holes)}
            par={(p) => parSum(1, holes, p)}
            spare={columns.length < MAX_LIVE_PLAYERS}
            strong
          />
        </View>

        <View className="mx-4 mt-4 gap-2">
          <Pressable
            className="flex-row items-center justify-center gap-2 rounded-full bg-primary py-3.5 active:opacity-80"
            onPress={onFinish}
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle" size={18} color={colors.primaryForeground} />
            <Text className="font-semibold text-base text-primary-foreground">Finish round</Text>
          </Pressable>
          <Text className="text-center text-xs text-muted-foreground">
            Your card is saved as a round; points and badges follow.
          </Text>
          {confirmDiscard ? (
            <View className="mt-2 flex-row items-center justify-center gap-3">
              <Text className="text-sm text-foreground">Throw this round away?</Text>
              <Pressable onPress={onDiscard} accessibilityRole="button">
                <Text className="font-semibold text-sm text-destructive">Yes, discard</Text>
              </Pressable>
              <Pressable onPress={() => setConfirmDiscard(false)} accessibilityRole="button">
                <Text className="text-sm text-muted-foreground">Keep</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              className="mt-2 items-center py-2"
              onPress={() => setConfirmDiscard(true)}
              accessibilityRole="button"
            >
              <Text className="text-sm text-muted-foreground">Discard round</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {picking && (
        <ScorePicker
          player={picking.player}
          hole={picking.hole}
          par={parOf(picking.hole)}
          current={strokesOf(picking.player, picking.hole)}
          onPick={(s) => pick(picking.player, picking.hole, s)}
          onClose={() => setPicking(null)}
        />
      )}
      {adding && <AddPlayer live={live} onClose={() => setAdding(false)} />}
    </View>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}

function Row({ label, sub, header }: { label: string; sub: string; header?: boolean }) {
  return (
    <View className={cn('flex-row items-center px-0 py-2', header && 'bg-elevated')}>
      <View className="flex-row items-center gap-1" style={{ width: 72 }}>
        <View className="w-8 items-center">
          <Text className="text-[11px] text-muted-foreground">{label}</Text>
        </View>
        <Text className="text-[11px] text-muted-foreground">{sub}</Text>
      </View>
    </View>
  );
}

/**
 * A score, marked the way golfers mark a card: a circle for under par, a
 * square for over, two for a double or worse.
 */
function ScoreCell({
  strokes,
  par,
  color,
  onPress,
  label,
}: {
  strokes?: number;
  par?: number;
  color: string;
  onPress: () => void;
  label: string;
}) {
  const diff = strokes !== undefined && par !== undefined ? strokes - par : undefined;
  const shape =
    diff === undefined
      ? 'none'
      : diff <= -2
        ? 'eagle'
        : diff === -1
          ? 'birdie'
          : diff === 0
            ? 'par'
            : diff === 1
              ? 'bogey'
              : 'double';
  return (
    <Pressable
      className="flex-1 items-center justify-center py-1.5 active:opacity-70"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${strokes ?? 'no score'}`}
    >
      <View
        className="h-9 w-9 items-center justify-center"
        style={{
          borderWidth: shape === 'none' || shape === 'par' ? 0 : 1.5,
          borderColor: shape === 'birdie' || shape === 'eagle' ? color : 'hsla(0, 0%, 100%, 0.55)',
          borderRadius: shape === 'birdie' || shape === 'eagle' ? 18 : 6,
        }}
      >
        {shape === 'eagle' || shape === 'double' ? (
          <View
            className="h-7 w-7 items-center justify-center"
            style={{
              borderWidth: 1.5,
              borderColor: shape === 'eagle' ? color : 'hsla(0, 0%, 100%, 0.55)',
              borderRadius: shape === 'eagle' ? 14 : 4,
            }}
          >
            <Text className="font-bold text-base text-foreground">{strokes}</Text>
          </View>
        ) : (
          <Text
            className={cn(
              'font-bold text-base',
              strokes === undefined ? 'text-muted-foreground' : 'text-foreground'
            )}
          >
            {strokes ?? '·'}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function TotalsRow({
  label,
  players,
  value,
  par,
  spare,
  strong,
}: {
  label: string;
  players: LivePlayer[];
  value: (p: LivePlayer) => number | undefined;
  par: (p: LivePlayer) => number;
  spare: boolean;
  strong?: boolean;
}) {
  return (
    <View
      className={cn('flex-row items-center border-border border-t py-2', strong && 'bg-elevated')}
    >
      <View style={{ width: 72 }} className="pl-2">
        <Text
          className={cn('text-xs', strong ? 'font-bold text-foreground' : 'text-muted-foreground')}
        >
          {label}
        </Text>
      </View>
      {players.map((p) => {
        const v = value(p);
        return (
          <View key={p.id} className="flex-1 items-center">
            <Text
              className={cn(
                'text-sm',
                strong ? 'font-bold text-foreground' : 'font-semibold text-foreground'
              )}
            >
              {v ?? '–'}
            </Text>
            {v !== undefined && (
              <Text className="text-[10px] text-muted-foreground">{formatToPar(v - par(p))}</Text>
            )}
          </View>
        );
      })}
      {spare && <View className="flex-1" />}
    </View>
  );
}

function HolesToggle({ holes, onChange }: { holes: 9 | 18; onChange: (h: 9 | 18) => void }) {
  return (
    <View className="flex-row self-start overflow-hidden rounded-full border border-border">
      {([9, 18] as const).map((h) => (
        <Pressable
          key={h}
          className={cn('px-2.5 py-1', holes === h && 'bg-primary')}
          onPress={() => onChange(h)}
          accessibilityRole="button"
          accessibilityState={{ selected: holes === h }}
        >
          <Text
            className={cn(
              'font-semibold text-[11px]',
              holes === h ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            {h}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ScorePicker({
  player,
  hole,
  par,
  current,
  onPick,
  onClose,
}: {
  player: LivePlayer;
  hole: number;
  par?: number;
  current?: number;
  onPick: (strokes: number | undefined) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/60"
        onPress={onClose}
        accessibilityLabel="Close"
      >
        <Pressable
          className="m-4 gap-3 rounded-3xl border border-border bg-elevated p-4"
          onPress={() => {}}
          accessibilityViewIsModal
        >
          <View className="flex-row items-center gap-3">
            <View
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: player.color }}
            >
              <Text className="font-bold text-xs" style={{ color: colors.background }}>
                {initials(player.name)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-base text-foreground">
                {player.id === 'me' ? 'You' : player.name} · Hole {hole}
              </Text>
              <Text className="text-xs text-muted-foreground">
                {par ? `Par ${par}` : 'Par unknown'}
              </Text>
            </View>
            {current !== undefined && (
              <Pressable onPress={() => onPick(undefined)} accessibilityRole="button">
                <Text className="text-sm text-destructive">Clear</Text>
              </Pressable>
            )}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {PICKS.map((n) => {
              const diff = par !== undefined ? n - par : undefined;
              return (
                <Pressable
                  key={n}
                  className={cn(
                    'h-14 items-center justify-center rounded-2xl bg-card active:opacity-70',
                    n === current && 'bg-primary'
                  )}
                  style={{ width: '22.5%' }}
                  onPress={() => onPick(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} strokes`}
                >
                  <Text className="font-bold text-lg text-foreground">{n}</Text>
                  {diff !== undefined && (
                    <Text className="text-[10px] text-muted-foreground">{formatToPar(diff)}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Someone to share the card with: one of your friends, or a name typed in. */
function AddPlayer({ live, onClose }: { live: LiveRound; onClose: () => void }) {
  const friends = useAppStore((s) => s.friends);
  const addLivePlayer = useAppStore((s) => s.addLivePlayer);
  const [name, setName] = useState('');
  const taken = new Set(live.players.map((p) => p.friendId));
  const available = friends.filter((f) => !taken.has(f.id));

  const add = (input: { name: string; friendId?: string }) => {
    addLivePlayer(input);
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end bg-black/60"
        onPress={onClose}
        accessibilityLabel="Close"
      >
        <Pressable
          className="m-4 gap-3 rounded-3xl border border-border bg-elevated p-4"
          onPress={() => {}}
          accessibilityViewIsModal
        >
          <Text className="font-bold text-lg text-foreground">Who&apos;s playing?</Text>
          {available.length > 0 && (
            <View className="flex-row flex-wrap gap-2">
              {available.map((f) => (
                <Pressable
                  key={f.id}
                  className="flex-row items-center gap-2 rounded-full bg-card px-3 py-2 active:opacity-70"
                  onPress={() => add({ name: f.name, friendId: f.id })}
                  accessibilityRole="button"
                >
                  <View
                    className="h-5 w-5 rounded-full"
                    style={{ backgroundColor: f.avatarColor }}
                  />
                  <Text className="text-sm text-foreground">{f.name}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <View className="flex-row gap-2">
            <TextInput
              className={withFontFamily(
                'h-12 flex-1 rounded-xl border border-input bg-background px-4 text-base text-foreground'
              )}
              value={name}
              onChangeText={setName}
              placeholder="Or type a name"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => name.trim() && add({ name: name.trim() })}
              accessibilityLabel="Player name"
            />
            <Pressable
              className={cn(
                'h-12 items-center justify-center rounded-xl bg-primary px-4 active:opacity-80',
                !name.trim() && 'opacity-40'
              )}
              disabled={!name.trim()}
              onPress={() => add({ name: name.trim() })}
              accessibilityRole="button"
            >
              <Text className="font-semibold text-sm text-primary-foreground">Add</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
