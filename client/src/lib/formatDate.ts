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

// Date-only values ("2026-11-03") carry no time zone. They parse as UTC midnight, so they are
// formatted in UTC too: with the local zone, a viewer west of UTC would see the previous day.
const DATE_ONLY_SHORT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const DATE_ONLY_FULL = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function parseDateOnly(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "Nov 3" from "2026-11-03" (no time zone shift). Returns "" for invalid input. */
export function formatDateOnly(value: string): string {
  const date = parseDateOnly(value);
  return date ? DATE_ONLY_SHORT.format(date) : "";
}

/**
 * NFR-9: "Nov 3 – Nov 16". The year is added only when the range crosses years ("Dec 28, 2026 –
 * Jan 10, 2027"). One missing end gives "From Nov 3" / "Until Nov 16"; none gives "".
 */
export function formatDateRange(start: string | null, end: string | null): string {
  const from = start ? parseDateOnly(start) : null;
  const to = end ? parseDateOnly(end) : null;
  if (from && to) {
    return from.getUTCFullYear() === to.getUTCFullYear()
      ? `${DATE_ONLY_SHORT.format(from)} – ${DATE_ONLY_SHORT.format(to)}`
      : `${DATE_ONLY_FULL.format(from)} – ${DATE_ONLY_FULL.format(to)}`;
  }
  if (from) return `From ${DATE_ONLY_SHORT.format(from)}`;
  if (to) return `Until ${DATE_ONLY_SHORT.format(to)}`;
  return "";
}
