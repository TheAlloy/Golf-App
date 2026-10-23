import { CheckIn } from '@/models/types';

/** How long a tag stays up after its tee time: a leisurely 18 holes. */
export const CHECK_IN_HOURS = 5;
/** Tags further ahead than this don't show on the globe yet. */
export const UPCOMING_WINDOW_HOURS = 72;

export type WhenOption = { id: string; label: string; startsAt: () => Date };

function at(day: Date, hour: number): Date {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function daysAhead(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

/** Tee times to pick from: now, a little later, or the next couple of mornings. */
export function whenOptions(now = new Date()): WhenOption[] {
  const options: WhenOption[] = [
    { id: 'now', label: 'Now', startsAt: () => new Date() },
    { id: '1h', label: 'In 1 hour', startsAt: () => new Date(Date.now() + 3600_000) },
    { id: '2h', label: 'In 2 hours', startsAt: () => new Date(Date.now() + 7200_000) },
  ];
  if (now.getHours() < 11) {
    options.push({ id: 'pm', label: 'This afternoon', startsAt: () => at(new Date(), 13) });
  }
  options.push(
    { id: 'tm-am', label: 'Tomorrow 8am', startsAt: () => at(daysAhead(1), 8) },
    { id: 'tm-pm', label: 'Tomorrow 1pm', startsAt: () => at(daysAhead(1), 13) }
  );
  // The coming weekend, if it's more than a day off.
  const day = now.getDay();
  const toSaturday = (6 - day + 7) % 7;
  if (toSaturday > 1) {
    options.push({
      id: 'sat',
      label: 'Saturday 8am',
      startsAt: () => at(daysAhead(toSaturday), 8),
    });
  }
  return options;
}

export type CheckInStatus = 'now' | 'upcoming' | 'over';

export function checkInStatus(c: CheckIn, now = Date.now()): CheckInStatus {
  if (Date.parse(c.endsAt) <= now) return 'over';
  if (Date.parse(c.startsAt) > now) return 'upcoming';
  return 'now';
}

/** Tags worth drawing: on the course now, or teeing off within the window. */
export function isShowing(c: CheckIn, now = Date.now()): boolean {
  const status = checkInStatus(c, now);
  if (status === 'over') return false;
  return Date.parse(c.startsAt) - now < UPCOMING_WINDOW_HOURS * 3600_000;
}

const TIME: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

/** "Now", "since 9:12", "8:00 tomorrow", "Sat 8:00". */
export function whenLabel(c: CheckIn, now = new Date()): string {
  const start = new Date(c.startsAt);
  if (checkInStatus(c, now.getTime()) === 'now')
    return `since ${start.toLocaleTimeString([], TIME)}`;
  const time = start.toLocaleTimeString([], TIME);
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((startDay.getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return `at ${time}`;
  if (days === 1) return `${time} tomorrow`;
  return `${start.toLocaleDateString([], { weekday: 'short' })} ${time}`;
}

/** "Sam", "Sam & Alex", "Sam, Alex & Jo". */
export function names(list: string[]): string {
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} & ${list[list.length - 1]}`;
}

/** Everyone on the tag, poster first: "Sam with Alex & Jo". */
export function whoLabel(c: CheckIn, me = 'You'): string {
  const poster = c.by === 'me' ? me : c.byName;
  const others = c.with.map((p) => p.name);
  return others.length ? `${poster} with ${names(others)}` : poster;
}

/** Callout line under the course: who's there and when. */
export function checkInDetail(c: CheckIn, now = new Date()): string {
  const status = checkInStatus(c, now.getTime());
  const who = whoLabel(c);
  return status === 'now'
    ? `${who} · playing ${whenLabel(c, now)}`
    : `${who} · ${whenLabel(c, now)}`;
}

export function initialsOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || '?';
}
