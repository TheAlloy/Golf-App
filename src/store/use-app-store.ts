import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { findCatalogueCourse } from '@/data/course-catalogue';
import {
  Course,
  Friend,
  LatLng,
  LivePlayer,
  LiveRound,
  Profile,
  Round,
  WishlistItem,
} from '@/models/types';

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const AVATAR_COLORS = ['#A3E635', '#38BDF8', '#F472B6', '#FBBF24', '#A78BFA', '#34D399', '#FB7185'];

type AppState = {
  /**
   * Only the user's own courses live here. The bundled catalogue is static and
   * far too large to persist — look courses up through useCourse/useCourses.
   */
  customCourses: Course[];
  rounds: Round[];
  friends: Friend[];
  wishlist: WishlistItem[];
  profile: Profile;
  /** The round being played right now, if any. */
  liveRound: LiveRound | null;
  /**
   * Flag positions marked on earlier live rounds, by course id then hole, so
   * a course only has to be marked up once.
   */
  courseFlags: Record<string, Record<number, LatLng>>;

  addCustomCourse: (input: {
    name: string;
    coordinate: LatLng;
    city?: string;
    country?: string;
    par?: number;
    holes?: number;
  }) => Course;
  addRound: (input: Omit<Round, 'id' | 'createdAt'>) => Round;
  deleteRound: (roundId: string) => void;
  addFriend: (input: { name: string; handicap?: number }) => Friend;
  removeFriend: (friendId: string) => void;
  toggleWishlist: (courseId: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;

  startLiveRound: (courseId: string, holes: 9 | 18) => LiveRound;
  updateLiveRound: (patch: Partial<Omit<LiveRound, 'id' | 'courseId' | 'startedAt'>>) => void;
  setLiveScore: (playerId: string, hole: number, strokes: number | undefined) => void;
  addLivePlayer: (input: { name: string; friendId?: string }) => LivePlayer | null;
  removeLivePlayer: (playerId: string) => void;
  dropLivePin: (coordinate: LatLng) => void;
  removeLivePin: (pinId: string) => void;
  setLiveFlag: (hole: number, coordinate: LatLng | null) => void;
  setLivePar: (hole: number, par: number) => void;
  /** Save your card as a round and clear the live round. Returns the saved round. */
  finishLiveRound: () => Round | null;
  discardLiveRound: () => void;
};

/** How many can share a live card. */
export const MAX_LIVE_PLAYERS = 4;
const PLAYER_COLORS = ['hsl(158, 55%, 46%)', '#38BDF8', '#FBBF24', '#F472B6'];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      customCourses: [],
      rounds: [],
      friends: [],
      wishlist: [],
      profile: { name: 'Golfer' },
      liveRound: null,
      courseFlags: {},

      addCustomCourse: (input) => {
        const course: Course = {
          id: makeId('course'),
          name: input.name,
          city: input.city ?? '',
          region: '',
          country: input.country ?? '',
          continent: 'North America',
          coordinate: input.coordinate,
          par: input.par ?? 72,
          holes: input.holes ?? 18,
          type: '',
          // A course nobody has catalogued is about as rare as it gets.
          popularity: 5,
          isCustom: true,
        };
        set((s) => ({ customCourses: [...s.customCourses, course] }));
        return course;
      },

      addRound: (input) => {
        const round: Round = {
          ...input,
          id: makeId('round'),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ rounds: [round, ...s.rounds] }));
        return round;
      },

      deleteRound: (roundId) => set((s) => ({ rounds: s.rounds.filter((r) => r.id !== roundId) })),

      addFriend: (input) => {
        const friend: Friend = {
          id: makeId('friend'),
          name: input.name,
          handicap: input.handicap,
          avatarColor: AVATAR_COLORS[get().friends.length % AVATAR_COLORS.length],
        };
        set((s) => ({ friends: [...s.friends, friend] }));
        return friend;
      },

      removeFriend: (friendId) =>
        set((s) => ({
          friends: s.friends.filter((f) => f.id !== friendId),
          rounds: s.rounds.map((r) => ({
            ...r,
            playedWith: r.playedWith.filter((id) => id !== friendId),
          })),
        })),

      toggleWishlist: (courseId) =>
        set((s) => ({
          wishlist: s.wishlist.some((w) => w.courseId === courseId)
            ? s.wishlist.filter((w) => w.courseId !== courseId)
            : [{ courseId, addedAt: new Date().toISOString() }, ...s.wishlist],
        })),

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),

      startLiveRound: (courseId, holes) => {
        const me: LivePlayer = {
          id: 'me',
          name: get().profile.name || 'You',
          color: PLAYER_COLORS[0],
        };
        const round: LiveRound = {
          id: makeId('live'),
          courseId,
          startedAt: new Date().toISOString(),
          holesPlayed: holes,
          currentHole: 1,
          players: [me],
          scores: { me: [] },
          pins: [],
          flags: { ...(get().courseFlags[courseId] ?? {}) },
          pars: {},
          units: 'yd',
        };
        set({ liveRound: round });
        return round;
      },

      updateLiveRound: (patch) =>
        set((s) => (s.liveRound ? { liveRound: { ...s.liveRound, ...patch } } : {})),

      setLiveScore: (playerId, hole, strokes) =>
        set((s) => {
          if (!s.liveRound) return {};
          const row = [...(s.liveRound.scores[playerId] ?? [])];
          row[hole - 1] = strokes;
          return {
            liveRound: { ...s.liveRound, scores: { ...s.liveRound.scores, [playerId]: row } },
          };
        }),

      addLivePlayer: (input) => {
        const live = get().liveRound;
        if (!live || live.players.length >= MAX_LIVE_PLAYERS) return null;
        const player: LivePlayer = {
          id: makeId('player'),
          name: input.name,
          friendId: input.friendId,
          color: PLAYER_COLORS[live.players.length % PLAYER_COLORS.length],
        };
        set({
          liveRound: {
            ...live,
            players: [...live.players, player],
            scores: { ...live.scores, [player.id]: [] },
          },
        });
        return player;
      },

      removeLivePlayer: (playerId) =>
        set((s) => {
          if (!s.liveRound || playerId === 'me') return {};
          const scores = { ...s.liveRound.scores };
          delete scores[playerId];
          return {
            liveRound: {
              ...s.liveRound,
              players: s.liveRound.players.filter((p) => p.id !== playerId),
              scores,
            },
          };
        }),

      dropLivePin: (coordinate) =>
        set((s) =>
          s.liveRound
            ? {
                liveRound: {
                  ...s.liveRound,
                  pins: [
                    ...s.liveRound.pins,
                    {
                      id: makeId('pin'),
                      hole: s.liveRound.currentHole,
                      coordinate,
                      at: new Date().toISOString(),
                    },
                  ],
                },
              }
            : {}
        ),

      removeLivePin: (pinId) =>
        set((s) =>
          s.liveRound
            ? {
                liveRound: { ...s.liveRound, pins: s.liveRound.pins.filter((p) => p.id !== pinId) },
              }
            : {}
        ),

      setLiveFlag: (hole, coordinate) =>
        set((s) => {
          if (!s.liveRound) return {};
          const flags = { ...s.liveRound.flags };
          if (coordinate) flags[hole] = coordinate;
          else delete flags[hole];
          // Remember it for the course too, so next time the flags are already there.
          const courseFlags = { ...s.courseFlags, [s.liveRound.courseId]: flags };
          return { liveRound: { ...s.liveRound, flags }, courseFlags };
        }),

      setLivePar: (hole, par) =>
        set((s) =>
          s.liveRound
            ? { liveRound: { ...s.liveRound, pars: { ...s.liveRound.pars, [hole]: par } } }
            : {}
        ),

      finishLiveRound: () => {
        const live = get().liveRound;
        if (!live) return null;
        const course =
          get().customCourses.find((c) => c.id === live.courseId) ??
          findCatalogueCourse(live.courseId);
        const mine = live.scores.me ?? [];
        const holeScores = Array.from({ length: live.holesPlayed }, (_, i) => ({
          strokes: mine[i],
        }));
        const played = holeScores.filter((h) => h.strokes !== undefined);
        const score = played.length
          ? played.reduce((sum, h) => sum + (h.strokes ?? 0), 0)
          : undefined;
        // To par only means something against the holes actually scored.
        let toPar: number | undefined;
        if (score !== undefined && course) {
          const pars = holeScores.map((h, i) =>
            h.strokes === undefined
              ? 0
              : (course.holePars?.[i] ?? live.pars[i + 1] ?? course.par / course.holes)
          );
          toPar = Math.round(score - pars.reduce((a, b) => a + b, 0));
        }
        const round = get().addRound({
          courseId: live.courseId,
          date: live.startedAt.slice(0, 10),
          holesPlayed: live.holesPlayed,
          score,
          toPar,
          tags: ['live'],
          playedWith: live.players.flatMap((p) => (p.friendId ? [p.friendId] : [])),
          photos: [],
          holeScores: played.length ? holeScores : undefined,
        });
        set({ liveRound: null });
        return round;
      },

      discardLiveRound: () => set({ liveRound: null }),
    }),
    {
      name: 'golf-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 4,
      migrate: (persisted, version) => {
        let state = persisted as Partial<AppState>;
        // v3 added the wishlist; older stores simply start with an empty one.
        if (version < 3) state = { ...state, wishlist: [] };
        // v4 added live rounds and remembered flag positions.
        if (version < 4) state = { ...state, liveRound: null, courseFlags: {} };
        return state as AppState;
      },
    }
  )
);

/** Resolve a course id against the user's own courses, then the catalogue. */
export function useCourse(id: string | undefined): Course | undefined {
  const customCourses = useAppStore((s) => s.customCourses);
  return useMemo(() => {
    if (!id) return undefined;
    return customCourses.find((c) => c.id === id) ?? findCatalogueCourse(id);
  }, [customCourses, id]);
}

/** Resolve many course ids at once, skipping any that no longer exist. */
export function useCourses(ids: string[]): Map<string, Course> {
  const customCourses = useAppStore((s) => s.customCourses);
  const key = ids.join(',');
  return useMemo(() => {
    const map = new Map<string, Course>();
    for (const id of new Set(ids)) {
      const course = customCourses.find((c) => c.id === id) ?? findCatalogueCourse(id);
      if (course) map.set(id, course);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customCourses, key]);
}

/** Course ids the user has logged at least one round at. */
export function usePlayedCourseIds(): Set<string> {
  const rounds = useAppStore((s) => s.rounds);
  return useMemo(() => new Set(rounds.map((r) => r.courseId)), [rounds]);
}

/** True when the course is on the user's wishlist. */
export function useIsWishlisted(courseId: string | undefined): boolean {
  return useAppStore((s) => !!courseId && s.wishlist.some((w) => w.courseId === courseId));
}

/**
 * Everything the gamified screens read: rounds, the wishlist and every course
 * either of them references, resolved in one go.
 */
export function usePlayerData() {
  const rounds = useAppStore((s) => s.rounds);
  const wishlist = useAppStore((s) => s.wishlist);
  const courses = useCourses([
    ...rounds.map((r) => r.courseId),
    ...wishlist.map((w) => w.courseId),
  ]);
  return { rounds, wishlist, courses };
}
