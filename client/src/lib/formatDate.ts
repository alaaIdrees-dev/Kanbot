/** NFR-9: readable English dates ("Oct 21", "Oct 30, 2026"). Locale is fixed so the UI matches the wireframes. */
const SHORT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const FULL = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

/** "Oct 21". Accepts an ISO timestamp or a `YYYY-MM-DD` date. Returns "" for invalid input. */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : SHORT.format(date);
}

/** "Oct 30, 2026". */
export function formatFullDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : FULL.format(date);
}
