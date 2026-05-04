import {
  courses,
  schedule,
  intakes,
  getCourseName,
} from "../store";
import type {
  CourseBlock,
  TeacherWorkload,
} from "../types";

/** Add N days to a YYYY-MM-DD string */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * For a given teaching week (Monday W), a previously-submitted assignment
 * is still within the marking window if:
 *   assignmentWeekMonday >= W - 25  (grading deadline Friday hasn't passed)
 *   assignmentWeekMonday <= W       (delivery Sunday has already happened)
 *
 * Delivery = assignmentWeekMonday + 6 (Sunday)
 * Grading deadline = delivery + 19 days = assignmentWeekMonday + 25 (Friday)
 */
function isInMarkingWindow(assignmentWeekDate: string, currentWeekDate: string): boolean {
  return assignmentWeekDate >= addDays(currentWeekDate, -25) &&
         assignmentWeekDate <= currentWeekDate;
}

export function getCourseBlocks(intakeId: string): CourseBlock[] {
  const entries = schedule.filter((s) => s.intake === intakeId);
  if (entries.length === 0) return [];

  const blocks: CourseBlock[] = [];
  let current: {
    abbrev: string;
    start: string;
    end: string;
    weeks: number;
    assignments: string[];
    courseStart: string | null;
  } | null = null;

  for (const entry of entries) {
    if (!current || current.abbrev !== entry.courseAbbrev) {
      if (current) {
        blocks.push({
          courseAbbrev: current.abbrev,
          courseName: getCourseName(current.abbrev),
          startDate: current.start,
          endDate: current.end,
          weeks: current.weeks,
          assignmentWeeks: current.assignments,
          courseStartWeek: current.courseStart,
        });
      }
      current = {
        abbrev: entry.courseAbbrev,
        start: entry.weekDate,
        end: entry.weekDate,
        weeks: 1,
        assignments: entry.isAssignmentWeek ? [entry.weekDate] : [],
        courseStart: entry.isCourseStart ? entry.weekDate : null,
      };
    } else {
      current.end = entry.weekDate;
      current.weeks++;
      if (entry.isAssignmentWeek) current.assignments.push(entry.weekDate);
      if (entry.isCourseStart && !current.courseStart)
        current.courseStart = entry.weekDate;
    }
  }

  if (current) {
    blocks.push({
      courseAbbrev: current.abbrev,
      courseName: getCourseName(current.abbrev),
      startDate: current.start,
      endDate: current.end,
      weeks: current.weeks,
      assignmentWeeks: current.assignments,
      courseStartWeek: current.courseStart,
    });
  }

  return blocks;
}

export function calculateTeacherWorkloads(
  dateFrom?: string,
  dateTo?: string,
  courseOverrides?: Map<string, string>
): TeacherWorkload[] {
  const relevantSchedule = schedule.filter((s) => {
    if (dateFrom && s.weekDate < dateFrom) return false;
    if (dateTo && s.weekDate > dateTo) return false;
    return true;
  });

  const teacherMap = new Map<
    string,
    {
      courses: Map<string, Set<string>>;
      totalStudents: number;
      assignmentCount: number;
    }
  >();

  for (const course of courses) {
    // Use override if provided, otherwise use original responsible teacher
    const teacherName = courseOverrides?.get(course.abbreviation) ?? course.responsibleTeacher;
    if (!teacherName) continue;

    if (!teacherMap.has(teacherName)) {
      teacherMap.set(teacherName, {
        courses: new Map(),
        totalStudents: 0,
        assignmentCount: 0,
      });
    }

    const data = teacherMap.get(teacherName)!;
    const courseIntakes = new Set<string>();

    for (const entry of relevantSchedule) {
      if (entry.courseAbbrev === course.abbreviation) {
        courseIntakes.add(entry.intake);
        if (entry.isAssignmentWeek) {
          data.assignmentCount++;
        }
      }
    }

    if (courseIntakes.size > 0) {
      data.courses.set(course.abbreviation, courseIntakes);
      for (const intakeId of courseIntakes) {
        const intake = intakes.find((i) => i.id === intakeId);
        if (intake) data.totalStudents += intake.studentCount;
      }
    }
  }

  // Pre-build: all assignment entries per teacher for marking window calc
  const teacherAssignments = new Map<string, { weekDate: string; intake: string }[]>();
  for (const course of courses) {
    const teacherName = courseOverrides?.get(course.abbreviation) ?? course.responsibleTeacher;
    if (!teacherName) continue;
    if (!teacherAssignments.has(teacherName)) teacherAssignments.set(teacherName, []);
    for (const entry of relevantSchedule) {
      if (entry.courseAbbrev === course.abbreviation && entry.isAssignmentWeek) {
        teacherAssignments.get(teacherName)!.push({ weekDate: entry.weekDate, intake: entry.intake });
      }
    }
  }

  const allWeekDates = [...new Set(relevantSchedule.map((e) => e.weekDate))].sort();

  const workloads: TeacherWorkload[] = [];
  for (const [name, data] of teacherMap) {
    const courseDetails = Array.from(data.courses.entries()).map(
      ([abbrev, intakeSet]) => {
        const intakeIds = Array.from(intakeSet);
        const studentCount = intakeIds.reduce((sum, id) => {
          const intake = intakes.find((i) => i.id === id);
          return sum + (intake?.studentCount || 0);
        }, 0);
        return {
          courseName: getCourseName(abbrev),
          intakes: intakeIds,
          studentCount,
        };
      }
    );

    // Teaching load: students per week for this teacher's active courses
    const weeklyTeaching = new Map<string, { students: number; courses: Set<string> }>();
    const teacherAbbrevs = new Set(data.courses.keys());
    for (const entry of relevantSchedule) {
      if (!teacherAbbrevs.has(entry.courseAbbrev)) continue;
      const intake = intakes.find((i) => i.id === entry.intake);
      if (!intake) continue;
      if (!weeklyTeaching.has(entry.weekDate)) {
        weeklyTeaching.set(entry.weekDate, { students: 0, courses: new Set() });
      }
      const week = weeklyTeaching.get(entry.weekDate)!;
      week.students += intake.studentCount;
      week.courses.add(entry.courseAbbrev);
    }

    // Marking load: students within the 19-day grading window each week
    const assignmentEntries = teacherAssignments.get(name) || [];
    const weeklyMarking = new Map<string, number>();
    for (const weekDate of allWeekDates) {
      let markingStudents = 0;
      const seen = new Set<string>(); // avoid double-counting same intake+assignment
      for (const a of assignmentEntries) {
        if (isInMarkingWindow(a.weekDate, weekDate)) {
          const key = `${a.weekDate}:${a.intake}`;
          if (!seen.has(key)) {
            seen.add(key);
            const intake = intakes.find((i) => i.id === a.intake);
            if (intake) markingStudents += intake.studentCount;
          }
        }
      }
      if (markingStudents > 0) weeklyMarking.set(weekDate, markingStudents);
    }

    // Find peaks
    let peakTeaching = 0, peakTeachingDate: string | null = null, peakTeachingCourses: string[] = [];
    let peakMarking = 0, peakMarkingDate: string | null = null;
    let peakCombined = 0, peakCombinedDate: string | null = null, peakCombinedCourses: string[] = [];
    let overloadedWeeks = 0;

    for (const weekDate of allWeekDates) {
      const teaching = weeklyTeaching.get(weekDate)?.students ?? 0;
      const marking = weeklyMarking.get(weekDate) ?? 0;
      const combined = teaching + marking;

      if (teaching > peakTeaching) {
        peakTeaching = teaching;
        peakTeachingDate = weekDate;
        peakTeachingCourses = Array.from(weeklyTeaching.get(weekDate)?.courses ?? []).map(getCourseName);
      }
      if (marking > peakMarking) {
        peakMarking = marking;
        peakMarkingDate = weekDate;
      }
      if (combined > peakCombined) {
        peakCombined = combined;
        peakCombinedDate = weekDate;
        peakCombinedCourses = Array.from(weeklyTeaching.get(weekDate)?.courses ?? []).map(getCourseName);
      }
      if (combined > 50) overloadedWeeks++;
    }

    workloads.push({
      teacherName: name,
      totalCoursesResponsible: data.courses.size,
      totalStudents: data.totalStudents,
      assignmentGradingCount: data.assignmentCount,
      workloadScore: peakCombined,
      peakTeachingStudents: peakTeaching,
      peakTeachingWeekDate: peakTeachingDate,
      peakTeachingCourses,
      peakMarkingStudents: peakMarking,
      peakMarkingWeekDate: peakMarkingDate,
      peakWeeklyStudents: peakCombined,
      peakWeekDate: peakCombinedDate,
      peakWeekCourses: peakCombinedCourses,
      overloadedWeeks,
      courses: courseDetails,
    });
  }

  return workloads.sort((a, b) => b.workloadScore - a.workloadScore);
}

function getWeekMonday(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function getTeacherCurrentCourses(
  teacherName: string,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): {
  courseName: string;
  courseAbbrev: string;
  role: "responsible" | "2nd" | "3rd";
  intakes: string[];
}[] {
  const results: {
    courseName: string;
    courseAbbrev: string;
    role: "responsible" | "2nd" | "3rd";
    intakes: string[];
  }[] = [];

  const weekMonday = getWeekMonday(referenceDate);
  const activeAbbrevs = new Set<string>();
  const activeIntakesByCourse = new Map<string, Set<string>>();

  for (const entry of schedule) {
    if (entry.weekDate === weekMonday) {
      activeAbbrevs.add(entry.courseAbbrev);
      if (!activeIntakesByCourse.has(entry.courseAbbrev)) {
        activeIntakesByCourse.set(entry.courseAbbrev, new Set());
      }
      activeIntakesByCourse.get(entry.courseAbbrev)!.add(entry.intake);
    }
  }

  for (const course of courses) {
    if (!activeAbbrevs.has(course.abbreviation)) continue;

    let role: "responsible" | "2nd" | "3rd" | null = null;
    if (
      course.responsibleTeacher?.toLowerCase() === teacherName.toLowerCase()
    )
      role = "responsible";
    else if (course.secondTeacher?.toLowerCase() === teacherName.toLowerCase())
      role = "2nd";
    else if (course.thirdTeacher?.toLowerCase() === teacherName.toLowerCase())
      role = "3rd";

    if (role) {
      results.push({
        courseName: course.name,
        courseAbbrev: course.abbreviation,
        role,
        intakes: Array.from(
          activeIntakesByCourse.get(course.abbreviation) || []
        ),
      });
    }
  }

  return results;
}

export function getUpcomingAssignments(
  teacherName: string,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): {
  courseName: string;
  courseAbbrev: string;
  intake: string;
  deliveryDate: string;
  gradingDeadline: string;
  studentCount: number;
}[] {
  const teacherCourseAbbrevs = new Set<string>();
  for (const course of courses) {
    if (
      course.responsibleTeacher?.toLowerCase() === teacherName.toLowerCase()
    ) {
      teacherCourseAbbrevs.add(course.abbreviation);
    }
  }

  // Collect the last assignment week per intake+course (some courses mark
  // multiple consecutive weeks as isAssignmentWeek; only the final one is
  // the actual submission deadline).
  const lastWeekByKey = new Map<string, string>();
  for (const entry of schedule) {
    if (!entry.isAssignmentWeek || !teacherCourseAbbrevs.has(entry.courseAbbrev)) continue;
    const key = `${entry.intake}::${entry.courseAbbrev}`;
    const existing = lastWeekByKey.get(key);
    if (!existing || entry.weekDate > existing) {
      lastWeekByKey.set(key, entry.weekDate);
    }
  }

  const assignments: {
    courseName: string;
    courseAbbrev: string;
    intake: string;
    deliveryDate: string;
    gradingDeadline: string;
    studentCount: number;
  }[] = [];

  for (const [key, weekDate] of lastWeekByKey) {
    const [intakeId, courseAbbrev] = key.split("::");
    const deliveryDate = addDays(weekDate, 6);
    const gradingDeadline = addDays(deliveryDate, 19);
    if (gradingDeadline < referenceDate) continue;
    const intake = intakes.find((i) => i.id === intakeId);
    assignments.push({
      courseName: getCourseName(courseAbbrev),
      courseAbbrev,
      intake: intakeId,
      deliveryDate,
      gradingDeadline,
      studentCount: intake?.studentCount || 0,
    });
  }

  return assignments.sort((a, b) => a.gradingDeadline.localeCompare(b.gradingDeadline));
}

export function getNextCourseStart(
  teacherName: string,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): { courseName: string; startDate: string; intake: string } | null {
  const teacherCourseAbbrevs = new Set<string>();
  for (const course of courses) {
    if (
      course.responsibleTeacher?.toLowerCase() === teacherName.toLowerCase()
    ) {
      teacherCourseAbbrevs.add(course.abbreviation);
    }
  }

  let earliest: {
    courseName: string;
    startDate: string;
    intake: string;
  } | null = null;

  for (const entry of schedule) {
    if (
      entry.isCourseStart &&
      entry.weekDate > referenceDate &&
      teacherCourseAbbrevs.has(entry.courseAbbrev)
    ) {
      if (!earliest || entry.weekDate < earliest.startDate) {
        earliest = {
          courseName: getCourseName(entry.courseAbbrev),
          startDate: entry.weekDate,
          intake: entry.intake,
        };
      }
    }
  }

  return earliest;
}

export function getNextCourseStarts(
  teacherName: string,
  count: number = 3,
  referenceDate: string = new Date().toISOString().slice(0, 10)
): { courseName: string; startDate: string; intake: string }[] {
  const teacherCourseAbbrevs = new Set<string>();
  for (const course of courses) {
    if (course.responsibleTeacher?.toLowerCase() === teacherName.toLowerCase()) {
      teacherCourseAbbrevs.add(course.abbreviation);
    }
  }

  // Deduplicate by intake+course, keeping the earliest start date
  const earliest = new Map<string, { courseName: string; startDate: string; intake: string }>();

  for (const entry of schedule) {
    if (
      entry.isCourseStart &&
      entry.weekDate > referenceDate &&
      teacherCourseAbbrevs.has(entry.courseAbbrev)
    ) {
      const key = `${entry.intake}::${entry.courseAbbrev}`;
      const existing = earliest.get(key);
      if (!existing || entry.weekDate < existing.startDate) {
        earliest.set(key, {
          courseName: getCourseName(entry.courseAbbrev),
          startDate: entry.weekDate,
          intake: entry.intake,
        });
      }
    }
  }

  return [...earliest.values()]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, count);
}

export interface WeeklyTeacherLoad {
  weekDate: string;
  calendarWeek: string;
  teachers: {
    name: string;
    courses: {
      abbrev: string;
      courseName: string;
      intakes: string[];
      studentCount: number;
      isAssignmentWeek: boolean;
    }[];
    teachingStudents: number;
    markingStudents: number;
    totalStudents: number;
    totalIntakes: number;
    hasGrading: boolean;
  }[];
}

export function getWeeklyWorkloadBreakdown(
  dateFrom?: string,
  dateTo?: string,
  courseOverrides?: Map<string, string>
): WeeklyTeacherLoad[] {
  // Build a map: teacher -> course abbreviations they are responsible for
  const teacherCourses = new Map<string, Set<string>>();
  for (const course of courses) {
    const name = courseOverrides?.get(course.abbreviation) ?? course.responsibleTeacher;
    if (!name) continue;
    if (!teacherCourses.has(name)) teacherCourses.set(name, new Set());
    teacherCourses.get(name)!.add(course.abbreviation);
  }

  // Build assignment entries per teacher for marking window calc
  const teacherAssignmentEntries = new Map<string, { weekDate: string; intake: string }[]>();
  for (const course of courses) {
    const name = courseOverrides?.get(course.abbreviation) ?? course.responsibleTeacher;
    if (!name) continue;
    if (!teacherAssignmentEntries.has(name)) teacherAssignmentEntries.set(name, []);
    for (const entry of schedule) {
      if (entry.courseAbbrev === course.abbreviation && entry.isAssignmentWeek) {
        teacherAssignmentEntries.get(name)!.push({ weekDate: entry.weekDate, intake: entry.intake });
      }
    }
  }

  // Group schedule entries by week date
  const weekMap = new Map<
    string,
    { calendarWeek: string; entries: typeof schedule }
  >();
  for (const entry of schedule) {
    if (dateFrom && entry.weekDate < dateFrom) continue;
    if (dateTo && entry.weekDate > dateTo) continue;
    if (!weekMap.has(entry.weekDate)) {
      weekMap.set(entry.weekDate, {
        calendarWeek: entry.calendarWeek,
        entries: [],
      });
    }
    weekMap.get(entry.weekDate)!.entries.push(entry);
  }

  const result: WeeklyTeacherLoad[] = [];

  for (const [weekDate, { calendarWeek, entries }] of [...weekMap.entries()].sort(
    (a, b) => a[0].localeCompare(b[0])
  )) {
    const teacherLoadMap = new Map<
      string,
      Map<
        string,
        { intakes: Set<string>; studentCount: number; isAssignment: boolean }
      >
    >();

    for (const entry of entries) {
      // Find which teacher is responsible for this course
      for (const [teacherName, courseSet] of teacherCourses) {
        if (!courseSet.has(entry.courseAbbrev)) continue;

        if (!teacherLoadMap.has(teacherName))
          teacherLoadMap.set(teacherName, new Map());

        const courseMap = teacherLoadMap.get(teacherName)!;
        if (!courseMap.has(entry.courseAbbrev)) {
          courseMap.set(entry.courseAbbrev, {
            intakes: new Set(),
            studentCount: 0,
            isAssignment: false,
          });
        }

        const courseData = courseMap.get(entry.courseAbbrev)!;
        courseData.intakes.add(entry.intake);
        const intake = intakes.find((i) => i.id === entry.intake);
        if (intake) courseData.studentCount += intake.studentCount;
        if (entry.isAssignmentWeek) courseData.isAssignment = true;
      }
    }

    const teachers: WeeklyTeacherLoad["teachers"] = [];
    for (const [name, courseMap] of teacherLoadMap) {
      const coursesArr = Array.from(courseMap.entries()).map(
        ([abbrev, data]) => ({
          abbrev,
          courseName: getCourseName(abbrev),
          intakes: Array.from(data.intakes),
          studentCount: data.studentCount,
          isAssignmentWeek: data.isAssignment,
        })
      );
      const teachingStudents = coursesArr.reduce((s, c) => s + c.studentCount, 0);

      // Marking load: students within the grading window this week
      const assignmentEntries = teacherAssignmentEntries.get(name) || [];
      const seen = new Set<string>();
      let markingStudents = 0;
      for (const a of assignmentEntries) {
        if (isInMarkingWindow(a.weekDate, weekDate)) {
          const key = `${a.weekDate}:${a.intake}`;
          if (!seen.has(key)) {
            seen.add(key);
            const intake = intakes.find((i) => i.id === a.intake);
            if (intake) markingStudents += intake.studentCount;
          }
        }
      }

      teachers.push({
        name,
        courses: coursesArr,
        teachingStudents,
        markingStudents,
        totalStudents: teachingStudents + markingStudents,
        totalIntakes: new Set(coursesArr.flatMap((c) => c.intakes)).size,
        hasGrading: coursesArr.some((c) => c.isAssignmentWeek),
      });
    }

    if (teachers.length > 0) {
      result.push({ weekDate, calendarWeek, teachers });
    }
  }

  return result;
}
