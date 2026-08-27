import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { findCatalogueCourse } from '@/data/course-catalogue';
import { Course, Friend, LatLng, Profile, Round } from '@/models/types';

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
  profile: Profile;

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
  updateProfile: (patch: Partial<Profile>) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      customCourses: [],
      rounds: [],
      friends: [],
      profile: { name: 'Golfer' },

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

      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
    }),
    {
      name: 'golf-app-store',
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
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
