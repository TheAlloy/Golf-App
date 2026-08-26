export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Course = {
  id: string;
  name: string;
  city: string;
  country: string;
  coordinate: LatLng;
  par: number;
  holes: number;
  /**
   * Estimated share (0–100) of active golfers who have played this course.
   * Drives rarity points: the lower the popularity, the more points a play
   * is worth. Seeded values are rough estimates until real play data exists.
   */
  popularity: number;
  /** True for courses the user added by dropping a pin on the map. */
  isCustom?: boolean;
};

export type Friend = {
  id: string;
  name: string;
  handicap?: number;
  avatarColor: string;
};

export type Round = {
  id: string;
  courseId: string;
  /** ISO date (yyyy-mm-dd) the round was played. */
  date: string;
  holesPlayed: 9 | 18;
  /** Gross score for the holes played. */
  score?: number;
  /** Score relative to par, derived from score when available. */
  toPar?: number;
  occasion?: string;
  notes?: string;
  tags: string[];
  /** Friend ids of playing partners. */
  playedWith: string[];
  /** Local photo URIs attached to the round. */
  photos: string[];
  createdAt: string;
};

export type Profile = {
  name: string;
  handicap?: number;
  homeCity?: string;
};
