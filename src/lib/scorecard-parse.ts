/**
 * Turns the text read off a photographed scorecard into hole scores.
 *
 * A printed card is a grid: a row of hole numbers, yardages, par, stroke
 * index, then one or more rows of handwritten scores, usually split into a
 * front nine and a back nine with Out/In totals. OCR hands back that grid as
 * lines of numbers in reading order, so the job is to throw away the rows
 * that aren't scores and stitch the rest together.
 */

/** Strokes a hole can plausibly take. Anything larger is a yardage or a total. */
const MAX_STROKES = 15;

function numbersIn(line: string): number[] {
  return (line.match(/\d+/g) ?? []).map(Number);
}

/** 1 2 3 … or 10 11 12 …: the row that labels the holes. */
function isHoleNumberRow(values: number[]): boolean {
  if (values.length < 7) return false;
  let runs = 0;
  for (let i = 1; i < values.length; i++) if (values[i] === values[i - 1] + 1) runs++;
  return runs >= values.length - 2;
}

/** Stroke index: a shuffle of 1–18, so lots of distinct values above 9. */
function isStrokeIndexRow(values: number[]): boolean {
  const distinct = new Set(values).size === values.length;
  const high = values.filter((v) => v >= 10).length;
  return distinct && high >= 3 && values.every((v) => v >= 1 && v <= 18);
}

function sameAs(values: number[], pars?: (number | undefined)[]): boolean {
  if (!pars) return false;
  return values.every((v, i) => pars[i] === undefined || pars[i] === v);
}

/**
 * Hole scores from OCR text, or null when nothing on the card reads as a row
 * of scores. Pars, when known, help skip the par row (a good round can look
 * just like it otherwise).
 */
export function parseScorecardScores(
  text: string,
  holes: 9 | 18,
  pars?: (number | undefined)[]
): number[] | null {
  // Rows of plausible strokes, tagged with which nine they belong to once a
  // "10 11 12 …" hole-number row has been passed.
  const rows: { values: number[]; back: boolean }[] = [];
  let back = false;
  for (const line of text.split(/\r?\n/)) {
    const all = numbersIn(line);
    if (all.length < 7) continue;
    if (isHoleNumberRow(all)) {
      if (all[0] >= 10) back = true;
      continue;
    }
    // Drop yardages and Out/In/total columns, which are all too big to be strokes.
    const strokes = all.filter((v) => v >= 1 && v <= MAX_STROKES);
    if (strokes.length < 9) continue;
    if (isStrokeIndexRow(strokes.slice(0, 18))) continue;
    rows.push({ values: strokes, back });
  }
  if (rows.length === 0) return null;

  const scoreLike = (candidates: number[][], parSlice?: (number | undefined)[]) => {
    // Score rows sit below the par row on a card, so when several fit, the
    // last one that isn't just the pars is the best bet.
    const notPar = candidates.filter((c) => !sameAs(c, parSlice));
    const pool = notPar.length ? notPar : candidates;
    return pool[pool.length - 1] ?? null;
  };

  const full = scoreLike(
    rows.filter((r) => r.values.length >= holes).map((r) => r.values.slice(0, holes)),
    pars
  );
  if (full) return full;
  if (holes === 9) return null;

  // Front and back nines on separate lines.
  const nines = rows.filter((r) => r.values.length >= 9 && r.values.length < 18);
  const frontRows = nines.filter((r) => !r.back).map((r) => r.values.slice(0, 9));
  const backRows = nines.filter((r) => r.back).map((r) => r.values.slice(0, 9));
  if (frontRows.length && backRows.length) {
    const front = scoreLike(frontRows, pars?.slice(0, 9));
    const rear = scoreLike(backRows, pars?.slice(9, 18));
    return front && rear ? [...front, ...rear] : null;
  }
  // No hole-number rows to go by: the last two rows that aren't pars are the
  // likeliest pair, in reading order.
  const candidates = nines.map((r) => r.values.slice(0, 9));
  const notPar = candidates.filter((c, i) => !sameAs(c, pars?.slice((i % 2) * 9, (i % 2) * 9 + 9)));
  const pool = notPar.length >= 2 ? notPar : candidates;
  if (pool.length < 2) return null;
  return [...pool[pool.length - 2], ...pool[pool.length - 1]];
}
