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
