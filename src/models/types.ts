export type LatLng = {
  latitude: number;
  longitude: number;
};

export type Continent =
  'North America' | 'South America' | 'Europe' | 'Africa' | 'Asia' | 'Australia';

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
  /**
   * Par for each hole, when the source has it. Index 0 is hole 1; a hole the
   * source has no par for is undefined.
   */
  holePars?: (number | undefined)[];
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

/** A course the user wants to play. */
export type WishlistItem = {
  courseId: string;
  /** ISO timestamp. Only rounds logged after this count as ticking it off. */
  addedAt: string;
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

/** Someone keeping score on the live card: you, a friend, or a name typed in. */
export type LivePlayer = {
  id: string;
  name: string;
  /** Set when the player is one of your friends, so the saved round can credit them. */
  friendId?: string;
  color: string;
};

/** A spot marked on the course during a live round: where you are, or where a shot was hit from. */
export type ShotPin = {
  id: string;
  hole: number;
  coordinate: LatLng;
  /** ISO timestamp. */
  at: string;
};

/**
 * A round in progress. There is at most one; it lives in the store so the
 * app can be left and reopened mid-round without losing the card.
 */
export type LiveRound = {
  id: string;
  courseId: string;
  /** ISO timestamp. */
  startedAt: string;
  holesPlayed: 9 | 18;
  /** 1-based hole being played. */
  currentHole: number;
  /** You first, then up to three others. */
  players: LivePlayer[];
  /** Strokes per hole for each player id. Index 0 is hole 1. */
  scores: Record<string, (number | undefined)[]>;
  pins: ShotPin[];
  /** Where the flag is on each hole, as marked on the map. Keys are hole numbers. */
  flags: Record<number, LatLng>;
  /** Par set by hand for holes the catalogue has no par for. Keys are hole numbers. */
  pars: Record<number, number>;
  units: 'yd' | 'm';
};
