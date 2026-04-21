import coursesData from "./data/courses.json";
import teachersData from "./data/teachers.json";
import intakesData from "./data/intakes.json";
import scheduleData from "./data/schedule.json";
import abbreviationsData from "./data/abbreviations.json";
import type { Course, Teacher, Intake, ScheduleEntry } from "./types";

export const courses: Course[] = coursesData as Course[];
export const teachers: Teacher[] = teachersData as Teacher[];
export const intakes: Intake[] = intakesData as Intake[];
export const schedule: ScheduleEntry[] = scheduleData as ScheduleEntry[];
export const abbreviations: Record<string, string> =
  abbreviationsData as Record<string, string>;

// ── localStorage keys ────────────────────────────────────────────────────────
const KEY_INTAKES = "fed_custom_intakes";
const KEY_SCHEDULE = "fed_custom_schedule";
const KEY_OVERRIDES = "fed_student_overrides";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Pre-compute last schedule date per intake for active/completed status
export const intakeLastDate = new Map<string, string>();
for (const entry of schedule) {
  const prev = intakeLastDate.get(entry.intake);
  if (!prev || entry.weekDate > prev) {
    intakeLastDate.set(entry.intake, entry.weekDate);
  }
}

// ── Merge localStorage data into the live arrays on module load ──────────────
(function loadCustomData() {
  const overrides = readJSON<Record<string, number>>(KEY_OVERRIDES, {});
  const customIntakes = readJSON<Intake[]>(KEY_INTAKES, []);
  const customSchedule = readJSON<ScheduleEntry[]>(KEY_SCHEDULE, []);

  // Apply student-count overrides to existing intakes
  for (const intake of intakes) {
    if (overrides[intake.id] !== undefined) {
      intake.studentCount = overrides[intake.id];
    }
  }

  // Add custom intakes (also apply any overrides to them)
  for (const ci of customIntakes) {
    intakes.push({ ...ci, studentCount: overrides[ci.id] ?? ci.studentCount });
  }

  // Add generated schedule entries for custom intakes
  schedule.push(...customSchedule);

  // Rebuild intakeLastDate after pushing custom entries
  for (const entry of customSchedule) {
    const prev = intakeLastDate.get(entry.intake);
    if (!prev || entry.weekDate > prev) {
      intakeLastDate.set(entry.intake, entry.weekDate);
    }
  }
})();

// ── Persistence helpers (call then window.location.reload()) ─────────────────

/** Add a new custom intake and its generated schedule to localStorage. */
export function persistNewIntake(intake: Intake, scheduleEntries: ScheduleEntry[]): void {
  const existing = readJSON<Intake[]>(KEY_INTAKES, []);
  existing.push(intake);
  localStorage.setItem(KEY_INTAKES, JSON.stringify(existing));

  const existingSchedule = readJSON<ScheduleEntry[]>(KEY_SCHEDULE, []);
  existingSchedule.push(...scheduleEntries);
  localStorage.setItem(KEY_SCHEDULE, JSON.stringify(existingSchedule));
}

/** Persist a student-count override for any intake (base or custom). */
export function persistStudentCount(intakeId: string, count: number): void {
  const overrides = readJSON<Record<string, number>>(KEY_OVERRIDES, {});
  overrides[intakeId] = count;
  localStorage.setItem(KEY_OVERRIDES, JSON.stringify(overrides));
}

/** Remove a custom intake and its schedule from localStorage. */
export function deleteCustomIntake(intakeId: string): void {
  const existing = readJSON<Intake[]>(KEY_INTAKES, []).filter((i) => i.id !== intakeId);
  localStorage.setItem(KEY_INTAKES, JSON.stringify(existing));

  const existingSchedule = readJSON<ScheduleEntry[]>(KEY_SCHEDULE, []).filter(
    (e) => e.intake !== intakeId
  );
  localStorage.setItem(KEY_SCHEDULE, JSON.stringify(existingSchedule));

  const overrides = readJSON<Record<string, number>>(KEY_OVERRIDES, {});
  delete overrides[intakeId];
  localStorage.setItem(KEY_OVERRIDES, JSON.stringify(overrides));
}

/** True if the intake was added via the UI (not in the base JSON). */
export function isCustomIntake(intakeId: string): boolean {
  return readJSON<Intake[]>(KEY_INTAKES, []).some((i) => i.id === intakeId);
}

// ── Static helpers ────────────────────────────────────────────────────────────

export function getCourseName(abbrev: string): string {
  return abbreviations[abbrev] || abbrev;
}

export function getCourseByAbbrev(abbrev: string): Course | undefined {
  return courses.find((c) => c.abbreviation === abbrev);
}

export function getScheduleForIntake(intakeId: string): ScheduleEntry[] {
  return schedule.filter((s) => s.intake === intakeId);
}

export function getTeacherByName(name: string): Teacher | undefined {
  return teachers.find(
    (t) => t.name.toLowerCase() === name.toLowerCase()
  );
}

export function isIntakeActive(
  intakeId: string,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): boolean {
  const last = intakeLastDate.get(intakeId);
  return last != null && last >= referenceDate;
}

export function getActiveIntakes(
  referenceDate: string = new Date().toISOString().slice(0, 10)
): Intake[] {
  return intakes.filter(
    (i) => i.studentCount > 0 && isIntakeActive(i.id, referenceDate)
  );
}

export function getAllIntakesWithStudents(): Intake[] {
  return intakes.filter((i) => i.studentCount > 0);
}

export function getUniqueStudyPlans(): string[] {
  return [...new Set(intakes.map((i) => i.studyPlan).filter(Boolean))] as string[];
}
