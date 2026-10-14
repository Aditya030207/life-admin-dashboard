import { dateSchema } from "./domain";

export function monthDate(month: string): Date {
  dateSchema.parse(`${month}-01`);
  const date = new Date(`${month}-01T00:00:00Z`);
  return date;
}
export function shiftMonth(month: string, step: number): string | null {
  if (!Number.isInteger(step))
    throw new Error("Month shift must be an integer.");
  const date = monthDate(month);
  date.setUTCMonth(date.getUTCMonth() + step);
  const year = date.getUTCFullYear();
  return year >= 1 && year <= 9999 ? date.toISOString().slice(0, 7) : null;
}
/** Monday-first complete weeks. Date-only keys never pass through local time. */
export function monthCells(month: string): (string | null)[] {
  const first = monthDate(month);
  const offset = (first.getUTCDay() + 6) % 7;
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const days = last.getUTCDate();
  const cells = Array<string | null>(Math.ceil((offset + days) / 7) * 7).fill(
    null,
  );
  for (let day = 1; day <= days; day++)
    cells[offset + day - 1] = `${month}-${String(day).padStart(2, "0")}`;
  return cells;
}
export const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthDate(month));

/** Keyboard movement uses calendar days, never elapsed hours. */
export function calendarKeyDate(
  date: string,
  key: string,
  shift = false,
): string | null {
  dateSchema.parse(date);
  const current = new Date(`${date}T00:00:00Z`);
  const weekday = (current.getUTCDay() + 6) % 7;
  const delta: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
    Home: -weekday,
    End: 6 - weekday,
  };
  if (key === "PageUp" || key === "PageDown") {
    const month = shiftMonth(
      date.slice(0, 7),
      (key === "PageUp" ? -1 : 1) * (shift ? 12 : 1),
    );
    if (!month) return null;
    const days = monthCells(month).filter((day): day is string => Boolean(day));
    return days[Math.min(current.getUTCDate(), days.length) - 1];
  }
  if (!(key in delta)) return null;
  current.setUTCDate(current.getUTCDate() + delta[key]);
  return current.getUTCFullYear() >= 1 && current.getUTCFullYear() <= 9999
    ? current.toISOString().slice(0, 10)
    : null;
}
