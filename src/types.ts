export interface Course {
  code: string | null;
  name: string;
  abbreviation: string;
  year: number;
  semester: number | null;
  weeksFT: number;
  hours: number | null;
  credits: number | null;
  responsibleTeacher: string | null;
  secondTeacher: string | null;
  thirdTeacher: string | null;
}

export interface Teacher {
  name: string;
  coursesResponsible: number;
  courses2nd: number;
  courses3rd: number;
  onLeave: string | null;
  backDate: string | null;
}

export interface Intake {
  id: string;
  type: "FT" | "PT";
  startMonth: string;
  startYear: number;
  studentCount: number;
  studyPlan: string | null;
  lms: string | null;
}

export interface ScheduleEntry {
  intake: string;
  weekDate: string;
  calendarWeek: string;
  courseAbbrev: string;
  courseWeekNumber: number;
  isAssignmentWeek: boolean;
  isCourseStart: boolean;
}

export type Role = "pm" | "teacher";

export interface CourseBlock {
  courseAbbrev: string;
  courseName: string;
  startDate: string;
  endDate: string;
  weeks: number;
  assignmentWeeks: string[];
  courseStartWeek: string | null;
}

export interface TeacherWorkload {
  teacherName: string;
  totalCoursesResponsible: number;
  totalStudents: number;
  assignmentGradingCount: number;
  workloadScore: number;
  // Teaching load (active courses)
  peakTeachingStudents: number;
  peakTeachingWeekDate: string | null;
  peakTeachingCourses: string[];
  // Marking load (within 19-day grading window)
  peakMarkingStudents: number;
  peakMarkingWeekDate: string | null;
  // Combined peak (teaching + marking in same week)
  peakWeeklyStudents: number;
  peakWeekDate: string | null;
  peakWeekCourses: string[];
  overloadedWeeks: number;
  courses: { courseName: string; intakes: string[]; studentCount: number }[];
}
