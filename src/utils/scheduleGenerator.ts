import type { ScheduleEntry } from "../types";
import holidayData from "../data/holidays.json";

const HOLIDAY_WEEKS = new Set<string>(holidayData.holidays);

/** Add days to a YYYY-MM-DD string */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** ISO week label e.g. "Week 33" */
function getISOWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  // Thursday of the same week determines the year (ISO 8601)
  const thu = new Date(d);
  thu.setUTCDate(d.getUTCDate() + (4 - (d.getUTCDay() || 7)));
  const yearStart = new Date(Date.UTC(thu.getUTCFullYear(), 0, 4));
  const startThu = new Date(yearStart);
  startThu.setUTCDate(yearStart.getUTCDate() + (4 - (yearStart.getUTCDay() || 7)));
  const week = Math.round((thu.getTime() - startThu.getTime()) / (7 * 86400000)) + 1;
  return `Week ${week}`;
}

/** First Monday of a given month/year (returns YYYY-MM-DD) */
export function getFirstMonday(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month - 1, 1));
  const day = d.getUTCDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Build an intake ID from parts e.g. "AUG26FT" */
export function buildIntakeId(month: string, year: number, type: "FT" | "PT"): string {
  return `${month}${String(year).slice(2)}${type}`;
}

const MONTH_NUMS: Record<string, number> = { JAN: 1, MAR: 3, AUG: 8, OCT: 10 };
export function monthNumber(month: string): number {
  return MONTH_NUMS[month] ?? 1;
}

// ── Course sequence extraction ────────────────────────────────────────────────

interface CourseWeek {
  courseAbbrev: string;
  courseWeekNumber: number;
  isAssignmentWeek: boolean;
  isCourseStart: boolean;
}

/**
 * Extract the ordered course teaching-week sequence from a template intake,
 * ignoring the actual calendar dates (holidays are re-inserted at generation time).
 */
function extractCourseSequence(
  templateIntakeId: string,
  schedule: ScheduleEntry[]
): CourseWeek[] {
  return schedule
    .filter((e) => e.intake === templateIntakeId)
    .sort((a, b) => a.weekDate.localeCompare(b.weekDate))
    .map((e) => ({
      courseAbbrev: e.courseAbbrev,
      courseWeekNumber: e.courseWeekNumber,
      isAssignmentWeek: e.isAssignmentWeek,
      isCourseStart: e.isCourseStart,
    }));
}

// ── Schedule generation ───────────────────────────────────────────────────────

/**
 * Generate schedule entries for a new intake.
 *
 * Instead of shifting template dates (which misaligns holidays), this walks
 * week-by-week from newStartDate and skips any week in the holiday calendar.
 * The course sequence is cloned from the most recent matching template intake.
 */
export function generateIntakeSchedule(
  newIntakeId: string,
  newStartDate: string,
  type: "FT" | "PT",
  baseSchedule: ScheduleEntry[]
): ScheduleEntry[] {
  // Find the most recent template intake of the same type
  const intakeStarts = new Map<string, string>();
  for (const entry of baseSchedule) {
    const cur = intakeStarts.get(entry.intake);
    if (!cur || entry.weekDate < cur) intakeStarts.set(entry.intake, entry.weekDate);
  }

  const candidates = Array.from(intakeStarts.entries())
    .filter(([id]) => id.endsWith(type))
    .sort((a, b) => b[1].localeCompare(a[1])); // most recent first

  if (candidates.length === 0) return [];
  const [templateId] = candidates[0];

  const courseSequence = extractCourseSequence(templateId, baseSchedule);
  if (courseSequence.length === 0) return [];

  // Walk week-by-week from newStartDate, skipping holidays, assign each teaching week
  const result: ScheduleEntry[] = [];
  let currentDate = newStartDate;

  for (const week of courseSequence) {
    // Advance past any holiday weeks
    while (HOLIDAY_WEEKS.has(currentDate)) {
      currentDate = addDays(currentDate, 7);
    }

    result.push({
      intake: newIntakeId,
      weekDate: currentDate,
      calendarWeek: getISOWeekLabel(currentDate),
      courseAbbrev: week.courseAbbrev,
      courseWeekNumber: week.courseWeekNumber,
      isAssignmentWeek: week.isAssignmentWeek,
      isCourseStart: week.isCourseStart,
    });

    currentDate = addDays(currentDate, 7);
  }

  return result;
}
