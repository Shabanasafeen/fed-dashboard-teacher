import { useState, useMemo } from "react";
import { schedule, intakes, getCourseName } from "../../store";
import { format, parseISO, differenceInDays } from "date-fns";

const SIM_DATE = "2026-08-10";

// ── Aug 2026 course → responsible teacher mapping ────────────────────────────
const AUG2026_RESPONSIBLE: Record<string, string> = {
  INTRO:  "Shabana Jahan",
  DES:    "Monde",
  HTML:   "Adrian D Souza",
  PME:    "Lasse Hægland",
  SP1:    "Lasse Hægland",
  JS1:    "Lasse Hægland",
  AGC1:   "Adrian D Souza",
  PE1:    "Monde",
  POR1:   "Lasse Hægland",
  JS2:    "Lasse Hægland",
  WFL:    "Monde",
  CSS:    "Monde",
  SP2:    "Adrian D Souza",
  DVP:    "Monde",
  JSF:    "Adrian D Souza",
  AGC2:   "Monde",
  PE2:    "Adrian D Souza",
  POR2:   "Lasse Hægland",
};

const AUG2026_TEACHERS = ["Lasse Hægland", "Monde", "Adrian D Souza"];

const TEACHER_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Lasse Hægland":  { bg: "bg-teal-50",   text: "text-teal-700",   dot: "bg-teal-500"   },
  "Monde":          { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
  "Adrian D Souza": { bg: "bg-blue-50",   text: "text-blue-700",   dot: "bg-blue-500"   },
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getAssignments(teacherName: string, referenceDate: string) {
  // Find all course abbreviations this teacher is responsible for in Aug 2026
  const teacherCourses = new Set<string>(
    Object.entries(AUG2026_RESPONSIBLE)
      .filter(([, t]) => t === teacherName)
      .map(([abbrev]) => abbrev)
  );

  // Find the last assignment week per intake+course (only the final submission week counts)
  const lastWeekByKey = new Map<string, string>();
  for (const entry of schedule) {
    if (!entry.isAssignmentWeek || !teacherCourses.has(entry.courseAbbrev)) continue;
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
    const deliveryDate = addDays(weekDate, 6);      // Sunday of assignment week
    const gradingDeadline = addDays(deliveryDate, 19); // 19 days after delivery
    if (gradingDeadline < referenceDate) continue;  // skip fully expired
    const intake = intakes.find((i) => i.id === intakeId);
    assignments.push({
      courseName: getCourseName(courseAbbrev),
      courseAbbrev,
      intake: intakeId,
      deliveryDate,
      gradingDeadline,
      studentCount: intake?.studentCount ?? 0,
    });
  }

  return assignments.sort((a, b) => a.gradingDeadline.localeCompare(b.gradingDeadline));
}

export function GradingDeadlinesAug2026() {
  const [useSimDate, setUseSimDate] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState(AUG2026_TEACHERS[0]);
  const [showUpcoming, setShowUpcoming] = useState(false);

  const refDate = useSimDate ? SIM_DATE : new Date().toISOString().slice(0, 10);

  const allAssignments = useMemo(
    () => getAssignments(selectedTeacher, refDate),
    [selectedTeacher, refDate]
  );

  const delivered = allAssignments.filter((a) => a.deliveryDate <= refDate);
  const upcoming  = allAssignments.filter((a) => a.deliveryDate > refDate);

  const tc = TEACHER_COLORS[selectedTeacher] ?? { bg: "bg-gray-50", text: "text-gray-700", dot: "bg-gray-400" };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-gray-900">Grading Deadlines — August 2026</h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
              Planning scenario
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            Assignments delivered Sunday of the last course week. Grades due by Friday of the 3rd week after delivery.
          </p>
        </div>
        <button
          onClick={() => setUseSimDate(!useSimDate)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors shrink-0 ${
            useSimDate
              ? "bg-amber-50 border-amber-300 text-amber-700"
              : "bg-gray-50 border-gray-300 text-gray-600"
          }`}
        >
          {useSimDate ? "Viewing: Aug 2026 simulation" : `Viewing: Today (${refDate})`}
        </button>
      </div>

      {/* Context banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-sm text-blue-700">
        <p className="font-semibold text-blue-800 mb-1">August 2026 team</p>
        <p>
          Grading deadlines reflect course responsibilities assigned to{" "}
          <strong>Lasse Hægland</strong>, <strong>Monde</strong>, and{" "}
          <strong>Adrian D Souza</strong> following the team restructure. Previous responsible
          teachers (Nelly Moseki, Marvin Poole, Martin Kruger) are not shown.
        </p>
      </div>

      {/* Teacher picker */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Teacher</label>
        <div className="flex flex-wrap gap-2">
          {AUG2026_TEACHERS.map((name) => {
            const c = TEACHER_COLORS[name];
            const isActive = selectedTeacher === name;
            return (
              <button
                key={name}
                onClick={() => setSelectedTeacher(name)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                  isActive
                    ? `${c.bg} ${c.text} border-current shadow-sm`
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary strip */}
      <div className={`rounded-xl border p-4 mb-6 flex items-center gap-6 ${tc.bg}`}>
        <div>
          <p className={`text-xs font-medium ${tc.text} opacity-70`}>Active to mark</p>
          <p className={`text-2xl font-bold ${tc.text}`}>{delivered.length}</p>
        </div>
        <div className="w-px h-10 bg-current opacity-20" />
        <div>
          <p className={`text-xs font-medium ${tc.text} opacity-70`}>Students in active marking</p>
          <p className={`text-2xl font-bold ${tc.text}`}>{delivered.reduce((s, a) => s + a.studentCount, 0)}</p>
        </div>
        <div className="w-px h-10 bg-current opacity-20" />
        <div>
          <p className={`text-xs font-medium ${tc.text} opacity-70`}>Upcoming deliveries</p>
          <p className={`text-2xl font-bold ${tc.text}`}>{upcoming.length}</p>
        </div>
      </div>

      {/* Active grading */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-gray-900">Active Grading</h3>
          <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
            {delivered.length} assignment{delivered.length !== 1 ? "s" : ""} to mark
          </span>
        </div>

        {delivered.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500 text-sm">
            No assignments currently awaiting grading at this date
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-5 py-3 font-semibold text-gray-700">Course</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Intake</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Delivered</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Grading Deadline</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 text-center">Days Left</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 text-center">Students</th>
                  <th className="px-4 py-3 font-semibold text-gray-700 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {delivered.map((a, i) => {
                  const daysLeft = differenceInDays(parseISO(a.gradingDeadline), parseISO(refDate));
                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className="font-medium text-gray-900">{a.courseName}</span>
                        <span className="text-xs text-gray-400 ml-1">({a.courseAbbrev})</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.intake}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(parseISO(a.deliveryDate), "EEE, d MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(parseISO(a.gradingDeadline), "EEE, d MMM yyyy")}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${daysLeft <= 7 ? "text-red-600" : "text-gray-700"}`}>
                          {daysLeft}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium text-gray-700">
                        {a.studentCount}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {daysLeft <= 7 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Urgent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
              {delivered.length} assignment{delivered.length !== 1 ? "s" : ""} ·{" "}
              {delivered.reduce((s, a) => s + a.studentCount, 0)} students to grade
            </div>
          </div>
        )}
      </div>

      {/* Upcoming deliveries */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowUpcoming((v) => !v)}
            className="flex items-center gap-2 group"
          >
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              Upcoming Deliveries
            </h3>
            <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {upcoming.length} upcoming
            </span>
            <span className="text-xs text-gray-400 group-hover:text-indigo-500 transition-colors">
              {showUpcoming ? "▲ hide" : "▼ show"}
            </span>
          </button>
        </div>

        {showUpcoming && (
          upcoming.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500 text-sm">
              No upcoming assignment deliveries scheduled
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left">
                    <th className="px-5 py-3 font-semibold text-gray-700">Course</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Intake</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Delivery Date</th>
                    <th className="px-4 py-3 font-semibold text-gray-700">Grading Deadline</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-center">Days Until Delivery</th>
                    <th className="px-4 py-3 font-semibold text-gray-700 text-center">Students</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((a, i) => {
                    const daysUntil = differenceInDays(parseISO(a.deliveryDate), parseISO(refDate));
                    return (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <span className="font-medium text-gray-900">{a.courseName}</span>
                          <span className="text-xs text-gray-400 ml-1">({a.courseAbbrev})</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{a.intake}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {format(parseISO(a.deliveryDate), "EEE, d MMM yyyy")}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {format(parseISO(a.gradingDeadline), "EEE, d MMM yyyy")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${daysUntil <= 14 ? "text-amber-600" : "text-gray-600"}`}>
                            {daysUntil}d
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-gray-700">
                          {a.studentCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
}
