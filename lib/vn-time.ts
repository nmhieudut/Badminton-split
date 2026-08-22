/**
 * Vietnam is UTC+7 all year round — no daylight saving to account for.
 */
const VN_OFFSET_MINUTES = 7 * 60;

export interface VnParts {
  year: number;
  /** 1-12, not the 0-11 that Date uses. */
  month: number;
  day: number;
  hours: number;
  minutes: number;
}

/**
 * The parts of an instant as seen in Vietnam.
 *
 * Everything user-facing has to go through here rather than through getDate()
 * and friends, which read the machine's own zone. The server renders in UTC and
 * the browser renders in the viewer's zone, so those two disagree for seven
 * hours of every day — the server would send "22/08 · 17:30" and the browser
 * would draw "23/08 · 00:30" over it. React treats that as a corrupted tree,
 * and a later update can then fail outright while inserting a node.
 *
 * Everyone in the group is in Vietnam, so a fixed offset is both correct for
 * them and identical on both sides of the render.
 */
export function vnParts(value: Date | string): VnParts {
  const d = value instanceof Date ? value : new Date(value);
  const shifted = new Date(d.getTime() + VN_OFFSET_MINUTES * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' in Vietnam — the same string the sessions are keyed by. */
export function vnDateStr(value: Date | string = new Date()): string {
  const p = vnParts(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** 'DD/MM/YYYY · HH:MM' in Vietnam. */
export function formatVnDateTime(value: Date | string): string {
  const p = vnParts(value);
  return `${pad(p.day)}/${pad(p.month)}/${p.year} · ${pad(p.hours)}:${pad(p.minutes)}`;
}
