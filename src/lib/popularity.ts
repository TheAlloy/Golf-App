/**
 * Popularity proxy, 0–100: roughly what share of golfers have played a course.
 *
 * There is no play-count data in any open dataset, so until the app has its
 * own rounds to count, this is derived from how accessible a course is —
 * municipal and public courses see far more different golfers through them
 * than private clubs or remote resorts. Replace this with real counts once
 * the backend is aggregating rounds.
 */
const BY_TYPE: Record<string, number> = {
  municipal: 72,
  public: 62,
  'semi-private': 45,
  resort: 34,
  private: 20,
  military: 14,
  executive: 55,
};

export function popularityForType(type: string, holes: number): number {
  const key = (type || '').toLowerCase();
  // Types are compound, e.g. "Public/Municipal" or "Resort/Private". Take the
  // most accessible component, since that is what drives visitor numbers.
  let best: number | undefined;
  for (const part of key.split('/')) {
    const v = BY_TYPE[part.trim()];
    if (v !== undefined && (best === undefined || v > best)) best = v;
  }
  let score = best ?? 50;
  // Nine-hole courses tend to be small and local, so fewer golfers overall.
  if (holes === 9) score -= 12;
  return Math.min(100, Math.max(1, Math.round(score)));
}
