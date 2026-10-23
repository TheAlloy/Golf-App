import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import { CheckIn } from '@/models/types';
import { useAppStore } from '@/store/use-app-store';

/**
 * Keeps "playing here" tags flowing between you and your friends through
 * the backend: yours go up as you post them, theirs come down and show on
 * the globe. Without a backend configured (the local-first default) the
 * store is the whole world, and this does nothing.
 *
 * Schema: supabase/migrations/0002_check_ins.sql.
 */

type Row = {
  id: string;
  profile_id: string;
  course_id: string;
  course_name: string;
  latitude: number;
  longitude: number;
  starts_at: string;
  ends_at: string;
  note: string | null;
  created_at: string;
  profiles: { display_name: string } | null;
  check_in_partners: { profile_id: string | null; guest_name: string | null }[];
};

/** How often to re-read, on top of realtime pushes, so missed events heal. */
const REFRESH_MS = 5 * 60_000;

/** A friend's colour on the globe, by who they are in your friends list, or a stable fallback. */
function colorFor(profileId: string, friends: { profileId?: string; avatarColor: string }[]) {
  const friend = friends.find((f) => f.profileId === profileId);
  if (friend) return friend.avatarColor;
  const hues = [199, 330, 40, 265, 14, 158];
  let hash = 0;
  for (const ch of profileId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return `hsl(${hues[hash % hues.length]}, 80%, 60%)`;
}

function fromRow(row: Row, me: string | undefined): CheckIn {
  const { friends } = useAppStore.getState();
  const friendOf = (profileId: string | null) =>
    profileId ? friends.find((f) => f.profileId === profileId) : undefined;
  return {
    id: row.id,
    by: row.profile_id === me ? 'me' : (friendOf(row.profile_id)?.id ?? row.profile_id),
    byName: friendOf(row.profile_id)?.name ?? row.profiles?.display_name ?? 'A friend',
    byColor: colorFor(row.profile_id, friends),
    courseId: row.course_id,
    courseName: row.course_name,
    coordinate: { latitude: row.latitude, longitude: row.longitude },
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    with: row.check_in_partners.map((p) => ({
      friendId: friendOf(p.profile_id)?.id,
      name: friendOf(p.profile_id)?.name ?? p.guest_name ?? 'A friend',
    })),
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

/** Everything still up that you're allowed to see; the policies do the filtering. */
async function fetchTheirs(me: string | undefined): Promise<CheckIn[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('check_ins')
    .select(
      'id, profile_id, course_id, course_name, latitude, longitude, starts_at, ends_at, note, created_at, profiles(display_name), check_in_partners(profile_id, guest_name)'
    )
    .gt('ends_at', new Date().toISOString());
  if (error || !data) return null;
  return (data as unknown as Row[]).filter((r) => r.profile_id !== me).map((r) => fromRow(r, me));
}

/** Post one of your tags, with its partners. Quietly skipped when signed out. */
export async function publishCheckIn(checkIn: CheckIn): Promise<void> {
  if (!supabase || checkIn.by !== 'me') return;
  const { data } = await supabase.auth.getUser();
  const me = data.user?.id;
  if (!me) return;
  const { data: row } = await supabase
    .from('check_ins')
    .insert({
      profile_id: me,
      course_id: checkIn.courseId,
      course_name: checkIn.courseName,
      latitude: checkIn.coordinate.latitude,
      longitude: checkIn.coordinate.longitude,
      starts_at: checkIn.startsAt,
      ends_at: checkIn.endsAt,
      note: checkIn.note ?? null,
    })
    .select('id')
    .single();
  if (!row || checkIn.with.length === 0) return;
  const friends = useAppStore.getState().friends;
  await supabase.from('check_in_partners').insert(
    checkIn.with.map((p) => {
      const profileId = p.friendId && friends.find((f) => f.id === p.friendId)?.profileId;
      return {
        check_in_id: row.id,
        profile_id: profileId ?? null,
        guest_name: profileId ? null : p.name,
      };
    })
  );
}

/** Take your tags at a course down from the backend too. */
export async function unpublishCheckIns(courseId: string): Promise<void> {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  const me = data.user?.id;
  if (!me) return;
  await supabase.from('check_ins').delete().eq('profile_id', me).eq('course_id', courseId);
}

/**
 * Mount once at the root. Pulls friends' tags on start, on every realtime
 * change, and every few minutes; pushes yours as they're added or ended.
 */
export function usePresenceSync() {
  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let me: string | undefined;
    let stopped = false;

    const refresh = async () => {
      const theirs = await fetchTheirs(me);
      if (theirs && !stopped) useAppStore.getState().receiveCheckIns(theirs);
    };

    client.auth.getUser().then(({ data }) => {
      me = data.user?.id;
      refresh();
    });
    const channel = client
      .channel('check-ins')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'check_ins' }, refresh)
      .subscribe();
    const timer = setInterval(refresh, REFRESH_MS);

    // Mirror your own tags: anything new goes up, anything gone comes down.
    let known = new Set(
      useAppStore
        .getState()
        .checkIns.filter((c) => c.by === 'me')
        .map((c) => c.id)
    );
    const unsubscribe = useAppStore.subscribe((state, previous) => {
      if (state.checkIns === previous.checkIns) return;
      const mine = state.checkIns.filter((c) => c.by === 'me');
      for (const c of mine) if (!known.has(c.id)) publishCheckIn(c);
      const ids = new Set(mine.map((c) => c.id));
      for (const c of previous.checkIns) {
        if (c.by === 'me' && !ids.has(c.id)) unpublishCheckIns(c.courseId);
      }
      known = ids;
    });

    return () => {
      stopped = true;
      clearInterval(timer);
      unsubscribe();
      client.removeChannel(channel);
    };
  }, []);
}
