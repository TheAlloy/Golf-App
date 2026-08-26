import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_COURSES } from '@/data/seed-courses';
import { Course, Friend, LatLng, Profile, Round } from '@/models/types';

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const AVATAR_COLORS = ['#2E7D32', '#1565C0', '#C62828', '#6A1B9A', '#EF6C00', '#00838F', '#4E342E'];

type AppState = {
  courses: Course[];
  rounds: Round[];
  friends: Friend[];
  profile: Profile;

  addCustomCourse: (input: { name: string; coordinate: LatLng; city?: string; country?: string; par?: number; holes?: number }) => Course;
  addRound: (input: Omit<Round, 'id' | 'createdAt'>) => Round;
  deleteRound: (roundId: string) => void;
  addFriend: (input: { name: string; handicap?: number }) => Friend;
  removeFriend: (friendId: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      courses: SEED_COURSES,
      rounds: [],
      friends: [],
      profile: { name: 'Golfer' },

      addCustomCourse: (input) => {
        const course: Course = {
          id: makeId('course'),
          name: input.name,
          city: input.city ?? '',
          country: input.country ?? '',
          coordinate: input.coordinate,
          par: input.par ?? 72,
          holes: input.holes ?? 18,
          // Custom pins default to very rare until real play data exists.
          popularity: 5,
          isCustom: true,
        };
        set((s) => ({ courses: [...s.courses, course] }));
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

      deleteRound: (roundId) =>
        set((s) => ({ rounds: s.rounds.filter((r) => r.id !== roundId) })),

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
      version: 1,
      // Keep newly shipped seed courses when rehydrating an older store.
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState> | undefined;
        const persistedCourses = p?.courses ?? [];
        const persistedIds = new Set(persistedCourses.map((c) => c.id));
        const missingSeeds = SEED_COURSES.filter((c) => !persistedIds.has(c.id));
        return {
          ...current,
          ...p,
          courses: [...persistedCourses, ...missingSeeds],
        };
      },
    }
  )
);

export function usePlayedCourseIds(): Set<string> {
  const rounds = useAppStore((s) => s.rounds);
  return new Set(rounds.map((r) => r.courseId));
}

export function useCoursesById(): Map<string, Course> {
  const courses = useAppStore((s) => s.courses);
  return new Map(courses.map((c) => [c.id, c]));
}
