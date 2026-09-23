import type { Enrollment, Program } from "@/types/db";

const DAY = 24 * 60 * 60 * 1000;

/** Effective start/end for an enrollment (enrollment overrides program). */
export function enrollmentDates(program: Program, enrollment?: Pick<Enrollment, "start_date" | "end_date"> | null) {
  const start = new Date(enrollment?.start_date ?? program.start_date);
  const end = new Date(enrollment?.end_date ?? program.end_date);
  return { start, end };
}

/** Number of weeks to render for an enrollment (program duration, or override-derived). */
export function totalWeeks(program: Program, enrollment?: Pick<Enrollment, "start_date" | "end_date"> | null) {
  if (!enrollment?.start_date && !enrollment?.end_date) return program.duration_weeks;
  const { start, end } = enrollmentDates(program, enrollment);
  return Math.max(1, Math.ceil((end.getTime() - start.getTime() + DAY) / (7 * DAY)));
}

/** Monday–Thursday label like "4/20 – 4/23" for week w (1-based) from a start date. */
export function weekRangeLabel(start: Date, w: number) {
  const mon = new Date(start);
  mon.setDate(mon.getDate() + (w - 1) * 7);
  const thu = new Date(mon);
  thu.setDate(thu.getDate() + 3);
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;
  return `${fmt(mon)} – ${fmt(thu)}`;
}

/** Week index (1-based) that contains `date`, clamped to [1, total]. */
export function weekOf(start: Date, date: Date, total: number) {
  const diff = Math.floor((date.getTime() - start.getTime()) / (7 * DAY));
  return Math.max(1, Math.min(total, diff + 1));
}

export function currentWeek(program: Program, enrollment?: Pick<Enrollment, "start_date" | "end_date"> | null) {
  const { start } = enrollmentDates(program, enrollment);
  return weekOf(start, new Date(), totalWeeks(program, enrollment));
}

export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function formatDate(value: string | Date | null | undefined, locale: "ko" | "en" = "ko") {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(locale === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(value: string | Date | null | undefined, locale: "ko" | "en" = "ko") {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString(locale === "ko" ? "ko-KR" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
