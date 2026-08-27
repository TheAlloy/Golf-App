export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Continent =
  | 'North America'
  | 'South America'
  | 'Europe'
  | 'Africa'
  | 'Asia'
  | 'Australia';

export type Course = {
  id: string;
  name: string;
  city: string;
  /** US state code for bundled US courses; empty otherwise. */
  region: string;
  country: string;
  continent: Continent;
  coordinate: LatLng;
  par: number;
  holes: number;
  /** Access type from the source data: Public, Private, Resort, Municipal… */
  type: string;
  /** Par for each hole, when the source has it. Length 9 or 18. */
  holePars?: number[];
  /**
   * Estimated share (0–100) of golfers who have played here. Drives rarity
   * points: the lower, the more a round is worth. Until real play counts
   * exist this is derived from access type — see lib/popularity.ts.
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

/** Per-hole detail for a logged round. Index 0 is hole 1. */
export type HoleScore = {
  strokes?: number;
  putts?: number;
  /** Tee shot found the fairway. Not meaningful on par 3s. */
  fairwayHit?: boolean;
  /** Green in regulation. */
  gir?: boolean;
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
  /** Hole-by-hole detail, when the user filled in a scorecard. */
  holeScores?: HoleScore[];
  createdAt: string;
};

export type Profile = {
  name: string;
  handicap?: number;
  homeCity?: string;
};

export type RoundStats = {
  fairwaysHit: number;
  fairwayChances: number;
  greensInRegulation: number;
  girChances: number;
  putts: number;
};
