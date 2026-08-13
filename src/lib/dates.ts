import {
  addDays,
  addWeeks,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  endOfYear,
  format,
  getISOWeek,
  getISOWeekYear,
  getMonth,
  isWeekend,
  parseISO,
  setISOWeek,
  startOfISOWeek,
  startOfYear,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { TIMEZONE } from "./constants";

export function nowInMonterrey(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function todayISO(): string {
  return format(nowInMonterrey(), "yyyy-MM-dd");
}

export function currentYearNumber(): number {
  return nowInMonterrey().getFullYear();
}

export function currentISOWeek(): number {
  return getISOWeek(nowInMonterrey());
}

export function weekStart(year: number, week: number): Date {
  const base = setISOWeek(startOfYear(new Date(year, 0, 4)), week);
  return startOfISOWeek(base);
}

export function weekWorkdays(year: number, week: number): Date[] {
  const start = weekStart(year, week);
  return [0, 1, 2, 3, 4].map((i) => addDays(start, i));
}

export function weekLabel(year: number, week: number): string {
  return `W${week}`;
}

export function formatDayHeader(date: Date): string {
  return format(date, "EEE d");
}

export function formatMonthDay(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "MMMM d");
}

export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function parseDate(iso: string): Date {
  return parseISO(iso);
}

/** Calendar quarters (not fiscal): Q1 Jan–Mar Winter, Q2 Apr–Jun Spring, Q3 Jul–Sep Summer, Q4 Oct–Dec Fall */
export function quarterAndSeason(date: Date): { quarter: string; season: string } {
  const m = getMonth(date) + 1;
  if (m <= 3) return { quarter: "Q1", season: "Winter" };
  if (m <= 6) return { quarter: "Q2", season: "Spring" };
  if (m <= 9) return { quarter: "Q3", season: "Summer" };
  return { quarter: "Q4", season: "Fall" };
}

export function contextMeta(year: number, week: number) {
  const start = weekStart(year, week);
  const { quarter, season } = quarterAndSeason(start);
  return { year, quarter, season, label: `${year} / ${quarter} / ${season}` };
}

/** True when this week starts a new calendar quarter vs the previous week in the list */
export function isNewCalendarQuarter(
  year: number,
  week: number,
  prevWeek: number | null,
): boolean {
  const q = quarterAndSeason(weekStart(year, week)).quarter;
  if (prevWeek == null) return true;
  const prevQ = quarterAndSeason(weekStart(year, prevWeek)).quarter;
  return q !== prevQ;
}

export function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function taskTouchesWeek(
  startDate: string | null,
  endDate: string | null,
  unscheduled: boolean,
  year: number,
  week: number,
): boolean {
  if (unscheduled || !startDate || !endDate) return false;
  const days = weekWorkdays(year, week);
  const wStart = toISODate(days[0]);
  const wEnd = toISODate(days[4]);
  return datesOverlap(startDate, endDate, wStart, wEnd);
}

export function allISOWeeksInYear(year: number): number[] {
  const weeks: number[] = [];
  let d = startOfISOWeek(new Date(year, 0, 4));
  // ensure we start at week belonging to this ISO year
  while (getISOWeekYear(d) < year) d = addWeeks(d, 1);
  while (getISOWeekYear(d) === year) {
    weeks.push(getISOWeek(d));
    d = addWeeks(d, 1);
  }
  return weeks;
}

export function yearCalendarDays(year: number): Date[] {
  return eachDayOfInterval({
    start: startOfYear(new Date(year, 0, 1)),
    end: endOfYear(new Date(year, 0, 1)),
  });
}

export function isWorkday(date: Date): boolean {
  return !isWeekend(date);
}

export function clampWeek(week: number): number {
  return Math.min(53, Math.max(1, week));
}

export function addWeekClamped(week: number, delta: number): number {
  return clampWeek(week + delta);
}

export { differenceInCalendarWeeks, addDays, addWeeks, format, getMonth, parseISO, isWeekend };