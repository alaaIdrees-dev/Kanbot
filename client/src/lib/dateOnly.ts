/**
 * Date-only values ("YYYY-MM-DD": `startDate`, `endDate`, `dueDate` in types/api.ts) have no time
 * zone. These helpers work on the local calendar, so "today" is the user's today (not UTC's) and
 * adding days never lands on the wrong date around midnight or a DST change.
 */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const pad = (n: number) => String(n).padStart(2, "0");

/** A local `Date` as "YYYY-MM-DD". */
export const toDateOnly = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** Today in the user's time zone. */
export const todayDateOnly = (): string => toDateOnly(new Date());

/** "2026-11-03" + 14 → "2026-11-17". Returns "" for anything that is not a date-only string. */
export function addDays(dateOnly: string, days: number): string {
  const match = DATE_ONLY.exec(dateOnly);
  if (!match) return "";
  const [, year, month, day] = match;
  return toDateOnly(new Date(Number(year), Number(month) - 1, Number(day) + days));
}

/** Whole calendar days from `from` to `to` (negative when `to` is earlier). NaN for invalid input. */
export function daysBetween(from: string, to: string): number {
  const a = DATE_ONLY.exec(from);
  const b = DATE_ONLY.exec(to);
  if (!a || !b) return NaN;
  // UTC midnights: the difference is an exact multiple of a day, whatever DST does locally.
  const start = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const end = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((end - start) / 86_400_000);
}

/** SPR-4: \"6 days left\", \"1 day left\", \"Ends today\", \"Ended 2 days ago\". \"\" without an end date. */
export function formatDaysLeft(endDate: string | null, today: string = todayDateOnly()): string {
  if (!endDate) return "";
  const days = daysBetween(today, endDate);
  if (Number.isNaN(days)) return "";
  if (days > 1) return `${days} days left`;
  if (days === 1) return "1 day left";
  if (days === 0) return "Ends today";
  return days === -1 ? "Ended 1 day ago" : `Ended ${-days} days ago`;
}
