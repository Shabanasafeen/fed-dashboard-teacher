import { useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import { courses, intakes, schedule } from "../../store";

// ─── Constants ────────────────────────────────────────────────────────────────

const AUG26_FROM = "2026-08-01";
const AUG26_TO   = "2026-12-31";
const TOTAL_STUDENTS = 163;
const OVERLOAD_THRESHOLD = 50; // students/week considered overloaded

const STAFF = ["Monde", "Nelly Moseki", "Adrian D Souza", "SSM", "Program Manager"] as const;
type StaffName = (typeof STAFF)[number];

const STAFF_COLORS: Record<StaffName, string> = {
  "Monde":            "#6366f1",
  "Nelly Moseki":     "#8b5cf6",
  "Adrian D Souza":   "#10b981",
  "SSM":              "#f59e0b",
  "Program Manager":  "#ec4899",
};

const SSM_NOTE =
  "SSM (Student Support Manager) — not an academic role. Including them as a course responsible is not appropriate.";

const PM_MAX_COURSES = 4;
const PM_NOTE = "Program Manager can support up to 3–4 Year 1 courses only.";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isInMarkingWindow(assignmentWeek: string, currentWeek: string): boolean {
  return assignmentWeek >= addDays(currentWeek, -25) && assignmentWeek <= currentWeek;
}

interface StaffWorkload {
  name: StaffName;
  courseCount: number;
  courseNames: string[];
  peakStudents: number;
  overloadedWeeks: number;
  avgStudentsPerWeek: number;
}

function computeWorkloads(
  assignments: Record<string, StaffName>
): StaffWorkload[] {
  // Filter schedule to Aug–Dec 2026
  const relevantSchedule = schedule.filter(
    (e) => e.weekDate >= AUG26_FROM && e.weekDate <= AUG26_TO
  );
  const allWeeks = [...new Set(relevantSchedule.map((e) => e.weekDate))].sort();

  // Build per-staff data
  const result: StaffWorkload[] = STAFF.map((name) => {
    const myCourses = Object.entries(assignments)
      .filter(([, t]) => t === name)
      .map(([abbrev]) => abbrev);

    if (myCourses.length === 0) {
      return { name, courseCount: 0, courseNames: [], peakStudents: 0, overloadedWeeks: 0, avgStudentsPerWeek: 0 };
    }

    const courseSet = new Set(myCourses);

    // Assignment entries for marking window
    const assignmentEntries: { weekDate: string; intake: string }[] = [];
    for (const entry of relevantSchedule) {
      if (courseSet.has(entry.courseAbbrev) && entry.isAssignmentWeek) {
        assignmentEntries.push({ weekDate: entry.weekDate, intake: entry.intake });
      }
    }

    let peakStudents = 0;
    let overloadedWeeks = 0;
    let totalStudentWeeks = 0;

    for (const weekDate of allWeeks) {
      // Teaching load this week
      let teaching = 0;
      for (const entry of relevantSchedule) {
        if (entry.weekDate !== weekDate) continue;
        if (!courseSet.has(entry.courseAbbrev)) continue;
        const intake = intakes.find((i) => i.id === entry.intake);
        if (intake) teaching += intake.studentCount;
      }

      // Marking load this week
      const seen = new Set<string>();
      let marking = 0;
      for (const a of assignmentEntries) {
        if (isInMarkingWindow(a.weekDate, weekDate)) {
          const key = `${a.weekDate}:${a.intake}`;
          if (!seen.has(key)) {
            seen.add(key);
            const intake = intakes.find((i) => i.id === a.intake);
            if (intake) marking += intake.studentCount;
          }
        }
      }

      const total = teaching + marking;
      if (total > peakStudents) peakStudents = total;
      if (total > OVERLOAD_THRESHOLD) overloadedWeeks++;
      totalStudentWeeks += total;
    }

    const uniqueCourseAbbrevs = [...new Set(myCourses)];
    const courseNames = uniqueCourseAbbrevs.map(
      (abbrev) => courses.find((c) => c.abbreviation === abbrev)?.name ?? abbrev
    );

    return {
      name,
      courseCount: uniqueCourseAbbrevs.length,
      courseNames,
      peakStudents,
      overloadedWeeks,
      avgStudentsPerWeek: allWeeks.length > 0 ? Math.round(totalStudentWeeks / allWeeks.length) : 0,
    };
  });

  return result;
}

interface WeeklyPoint {
  week: string;
  label: string;
  [staff: string]: number | string;
}

function computeWeeklyBreakdown(assignments: Record<string, StaffName>): WeeklyPoint[] {
  const relevantSchedule = schedule.filter(
    (e) => e.weekDate >= AUG26_FROM && e.weekDate <= AUG26_TO
  );
  const allWeeks = [...new Set(relevantSchedule.map((e) => e.weekDate))].sort();

  // Pre-build assignment entries per staff for marking window
  const staffAssignments: Record<StaffName, { weekDate: string; intake: string }[]> = {} as never;
  for (const name of STAFF) staffAssignments[name] = [];
  for (const entry of relevantSchedule) {
    if (!entry.isAssignmentWeek) continue;
    const teacher = assignments[entry.courseAbbrev];
    if (teacher) staffAssignments[teacher].push({ weekDate: entry.weekDate, intake: entry.intake });
  }

  return allWeeks.map((weekDate) => {
    const point: WeeklyPoint = {
      week: weekDate,
      label: weekDate.slice(5), // MM-DD
    };

    for (const name of STAFF) {
      const courseSet = new Set(
        Object.entries(assignments).filter(([, t]) => t === name).map(([a]) => a)
      );

      // Teaching
      let teaching = 0;
      for (const entry of relevantSchedule) {
        if (entry.weekDate !== weekDate) continue;
        if (!courseSet.has(entry.courseAbbrev)) continue;
        const intake = intakes.find((i) => i.id === entry.intake);
        if (intake) teaching += intake.studentCount;
      }

      // Marking
      const seen = new Set<string>();
      let marking = 0;
      for (const a of staffAssignments[name]) {
        if (isInMarkingWindow(a.weekDate, weekDate)) {
          const key = `${a.weekDate}:${a.intake}`;
          if (!seen.has(key)) {
            seen.add(key);
            const intake = intakes.find((i) => i.id === a.intake);
            if (intake) marking += intake.studentCount;
          }
        }
      }

      point[name] = teaching + marking;
      point[name + "_teaching"] = teaching;
      point[name + "_marking"] = marking;
    }

    return point;
  });
}

interface PilePoint {
  week: string;
  label: string;
  [staff: string]: number | string;
}

function computeMarkingPile(
  assignments: Record<string, StaffName>,
  studentsPerDay: number
): PilePoint[] {
  const relevantSchedule = schedule.filter(
    (e) => e.weekDate >= AUG26_FROM && e.weekDate <= AUG26_TO
  );
  const allWeeks = [...new Set(relevantSchedule.map((e) => e.weekDate))].sort();
  const clearPerWeek = studentsPerDay * 5; // 5 working days

  // Per staff: track pile week by week
  const piles: Record<StaffName, number> = {} as never;
  for (const name of STAFF) piles[name] = 0;

  return allWeeks.map((weekDate) => {
    const point: PilePoint = { week: weekDate, label: weekDate.slice(5) };

    for (const name of STAFF) {
      const courseSet = new Set(
        Object.entries(assignments).filter(([, t]) => t === name).map(([a]) => a)
      );

      // New submissions arriving this week
      let newSubmissions = 0;
      for (const entry of relevantSchedule) {
        if (entry.weekDate !== weekDate) continue;
        if (!entry.isAssignmentWeek) continue;
        if (!courseSet.has(entry.courseAbbrev)) continue;
        const intake = intakes.find((i) => i.id === entry.intake);
        if (intake) newSubmissions += intake.studentCount;
      }

      piles[name] = Math.max(0, piles[name] + newSubmissions - clearPerWeek);
      point[name] = piles[name];
    }

    return point;
  });
}

// Unique courses (INTRO appears twice in data)
function getUniqueCourses() {
  const seen = new Set<string>();
  return courses.filter((c) => {
    if (seen.has(c.abbreviation)) return false;
    seen.add(c.abbreviation);
    return true;
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Aug2026Sim() {
  const uniqueCourses = useMemo(getUniqueCourses, []);

  // Default: PM takes up to 4 Year 1 courses, rest split between Monde and Nelly
  const defaultAssignments = useMemo<Record<string, StaffName>>(() => {
    const result: Record<string, StaffName> = {};
    const others: StaffName[] = ["Monde", "Nelly Moseki", "Adrian D Souza"];
    let pmCount = 0;
    let otherIdx = 0;
    for (const c of uniqueCourses) {
      if (c.year === 1 && pmCount < PM_MAX_COURSES) {
        result[c.abbreviation] = "Program Manager";
        pmCount++;
      } else {
        result[c.abbreviation] = others[otherIdx % others.length];
        otherIdx++;
      }
    }
    return result;
  }, [uniqueCourses]);

  const [assignments, setAssignments] = useState<Record<string, StaffName>>(defaultAssignments);

  const handleAssign = useCallback((abbrev: string, staff: StaffName) => {
    setAssignments((prev) => ({ ...prev, [abbrev]: staff }));
  }, []);

  const handleReset = useCallback(() => {
    setAssignments(defaultAssignments);
  }, [defaultAssignments]);

  const [studentsPerDay, setStudentsPerDay] = useState(4);
  const workloads = useMemo(() => computeWorkloads(assignments), [assignments]);
  const weeklyData = useMemo(() => computeWeeklyBreakdown(assignments), [assignments]);
  const pileData = useMemo(() => computeMarkingPile(assignments, studentsPerDay), [assignments, studentsPerDay]);

  const chartData = workloads.map((w) => ({
    name: w.name === "Nelly Moseki" ? "Nelly" : w.name,
    fullName: w.name,
    peak: w.peakStudents,
    courses: w.courseCount,
    overloadedWeeks: w.overloadedWeeks,
  }));

  const _totalAssigned = Object.keys(assignments).length; void _totalAssigned;
  const overloadedStaff = workloads.filter((w) => w.peakStudents > OVERLOAD_THRESHOLD);

  // PM constraint checks
  const pmCourses = uniqueCourses.filter((c) => assignments[c.abbreviation] === "Program Manager");
  const pmYear2Violations = pmCourses.filter((c) => c.year === 2);
  const pmOverCount = pmCourses.length > PM_MAX_COURSES;
  const hasPmViolation = pmYear2Violations.length > 0 || pmOverCount;

  const isViable = overloadedStaff.length === 0 && !hasPmViolation &&
    !Object.values(assignments).includes("SSM");

  // Course count per staff for the "math" section
  const coursesPerStaff = STAFF.map((name) => ({
    name,
    count: Object.values(assignments).filter((t) => t === name).length,
  }));

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-2xl font-bold text-gray-900">
            August 2026 Staffing Scenario
          </h2>
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              isViable
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {isViable ? "Viable" : "Not Viable"}
          </span>
        </div>
        <p className="text-gray-500 text-sm">
          Simulates running the FED programme with only Monde, Nelly, Adrian, SSM, and the Program Manager — {TOTAL_STUDENTS} students, {uniqueCourses.length} courses, Aug–Dec 2026.
        </p>
      </div>

      {/* Context banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3">
        <span className="text-amber-500 text-lg shrink-0">⚠️</span>
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Scenario Assumptions</p>
          <ul className="list-disc list-inside space-y-1 text-amber-700">
            <li><strong>163 students</strong> active across all cohorts in August 2026</li>
            <li><strong>19 courses</strong> to cover across Year 1 and Year 2</li>
            <li>Only <strong>5 staff members</strong> available: Monde, Nelly Moseki, Adrian D Souza, the SSM, and the Program Manager</li>
            <li>{SSM_NOTE}</li>
            <li>{PM_NOTE}</li>
            <li>Workload = teaching students + students within 19-day marking window</li>
          </ul>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Students</p>
          <p className="text-3xl font-bold text-gray-900">{TOTAL_STUDENTS}</p>
          <p className="text-xs text-gray-400 mt-1">Aug 2026 projection</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Courses to Cover</p>
          <p className="text-3xl font-bold text-gray-900">{uniqueCourses.length}</p>
          <p className="text-xs text-gray-400 mt-1">across Year 1 &amp; Year 2</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Available Staff</p>
          <p className="text-3xl font-bold text-gray-900">5</p>
          <p className="text-xs text-gray-400 mt-1">incl. SSM &amp; PM (with limits)</p>
        </div>
        <div className={`rounded-xl border shadow-sm p-4 ${isViable ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <p className={`text-xs mb-1 ${isViable ? "text-green-600" : "text-red-600"}`}>Overloaded Staff</p>
          <p className={`text-3xl font-bold ${isViable ? "text-green-700" : "text-red-700"}`}>
            {overloadedStaff.length} / 3
          </p>
          <p className={`text-xs mt-1 ${isViable ? "text-green-500" : "text-red-500"}`}>
            peak &gt; {OVERLOAD_THRESHOLD} students/week
          </p>
        </div>
      </div>

      {/* The Math */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">The Math</h3>
        <div className="grid grid-cols-3 gap-4">
          {coursesPerStaff.map(({ name, count }) => (
            <div
              key={name}
              className="rounded-lg border p-4 text-center"
              style={{ borderColor: STAFF_COLORS[name as StaffName] + "60", backgroundColor: STAFF_COLORS[name as StaffName] + "10" }}
            >
              <p className="text-sm font-semibold text-gray-700 mb-1">{name}</p>
              <p className="text-4xl font-bold" style={{ color: STAFF_COLORS[name as StaffName] }}>
                {count}
              </p>
              <p className="text-xs text-gray-500 mt-1">courses responsible</p>
              {name === "SSM" && count > 0 && (
                <p className="text-[10px] text-amber-600 mt-2 font-medium">Not appropriate for SSM role</p>
              )}
              {name === "Program Manager" && (
                <p className={`text-[10px] mt-2 font-medium ${count > PM_MAX_COURSES ? "text-red-600" : "text-emerald-600"}`}>
                  {count > PM_MAX_COURSES ? `Over limit (max ${PM_MAX_COURSES})` : `Max ${PM_MAX_COURSES} · Year 1 only`}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3 text-center">
          {uniqueCourses.length} courses ÷ 3 staff = ~{Math.ceil(uniqueCourses.length / 3)} courses per person on average.
          Reassign below to see if any distribution makes this viable.
        </p>
      </div>

      {/* Workload Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-1">Peak Weekly Workload (Aug–Dec 2026)</h3>
        <p className="text-xs text-gray-400 mb-4">
          Combined teaching + marking students at peak week. Red line = {OVERLOAD_THRESHOLD} students/week threshold.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 13 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                const w = workloads.find((x) => x.name === d.fullName);
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
                    <p className="font-semibold text-gray-900 mb-2">{d.fullName}</p>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div className="flex justify-between gap-4">
                        <span>Peak students/week:</span>
                        <span className={`font-bold ${d.peak > OVERLOAD_THRESHOLD ? "text-red-600" : "text-gray-900"}`}>{d.peak}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Courses responsible:</span>
                        <span className="font-medium">{d.courses}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Weeks over {OVERLOAD_THRESHOLD}:</span>
                        <span className={`font-medium ${d.overloadedWeeks > 0 ? "text-red-600" : "text-green-600"}`}>{d.overloadedWeeks}</span>
                      </div>
                      {w && w.courseNames.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-gray-500 mb-1">Courses:</p>
                          {w.courseNames.map((n) => (
                            <p key={n} className="text-gray-700">• {n}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <ReferenceLine
              y={OVERLOAD_THRESHOLD}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: `Threshold (${OVERLOAD_THRESHOLD})`, position: "insideTopRight", fill: "#ef4444", fontSize: 11 }}
            />
            <Bar dataKey="peak" name="Peak students/week" radius={[4, 4, 0, 0]}>
              {chartData.map((entry) => (
                <rect
                  key={entry.fullName}
                  fill={entry.peak > OVERLOAD_THRESHOLD ? "#ef4444" : STAFF_COLORS[entry.fullName as StaffName]}
                />
              ))}
              {chartData.map((entry, idx) => {
                const color = entry.peak > OVERLOAD_THRESHOLD ? "#ef4444" : STAFF_COLORS[entry.fullName as StaffName];
                return <rect key={idx} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Timeline Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-1">Weekly Workload — Every Week (Aug–Dec 2026)</h3>
        <p className="text-xs text-gray-400 mb-4">
          Each point = one week. Shows combined teaching + marking students per person. Red line = {OVERLOAD_THRESHOLD} student threshold.
        </p>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={weeklyData} margin={{ left: 0, right: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={3}
              angle={-45}
              textAnchor="end"
              height={45}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || payload.length === 0) return null;
                const point = payload[0]?.payload as WeeklyPoint;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[220px]">
                    <p className="font-semibold text-gray-700 mb-2">Week of {label}</p>
                    {payload.map((p) => {
                      const key = String(p.dataKey);
                      const total = Number(p.value);
                      const teaching = Number(point[key + "_teaching"] ?? 0);
                      const marking = Number(point[key + "_marking"] ?? 0);
                      return (
                        <div key={key} className="mb-2 pb-2 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold" style={{ color: p.color }}>{p.name}</span>
                            <span className={`font-bold ${total > OVERLOAD_THRESHOLD ? "text-red-600" : "text-gray-800"}`}>
                              {total} total
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-500 pl-1">
                            <span>Teaching</span>
                            <span className="font-medium text-blue-600">{teaching}</span>
                          </div>
                          <div className="flex justify-between text-gray-500 pl-1">
                            <span>Marking</span>
                            <span className="font-medium text-amber-600">{marking}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <ReferenceLine
              y={OVERLOAD_THRESHOLD}
              stroke="#ef4444"
              strokeDasharray="4 4"
              label={{ value: `Threshold (${OVERLOAD_THRESHOLD})`, position: "insideTopRight", fill: "#ef4444", fontSize: 10 }}
            />
            {STAFF.map((name) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                name={name === "Nelly Moseki" ? "Nelly" : name === "Adrian D Souza" ? "Adrian" : name === "Program Manager" ? "PM" : name}
                stroke={STAFF_COLORS[name]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Marking Pile Chart */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <div className="flex items-start justify-between mb-1 gap-4 flex-wrap">
          <div>
            <h3 className="font-semibold text-gray-900">Marking Pile Over Time</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              How many unfinished student markings are left at the end of each week, after clearing at the set pace.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs text-gray-600 whitespace-nowrap">Students marked per day:</label>
            <input
              type="number"
              min={1}
              max={20}
              value={studentsPerDay}
              onChange={(e) => setStudentsPerDay(Math.max(1, Number(e.target.value)))}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm w-16 text-center"
            />
            <span className="text-xs text-gray-400">= {studentsPerDay * 5} cleared/week</span>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-xs text-blue-800">
          A pile of <strong>0</strong> means the teacher is keeping up. Any number above 0 means unfinished markings are carrying over into the next week. The higher it climbs, the further behind they fall.
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={pileData} margin={{ left: 0, right: 10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              interval={3}
              angle={-45}
              textAnchor="end"
              height={45}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              content={({ payload, label }) => {
                if (!payload || payload.length === 0) return null;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs min-w-[180px]">
                    <p className="font-semibold text-gray-700 mb-2">Week of {label}</p>
                    {payload.map((p) => (
                      <div key={String(p.dataKey)} className="flex justify-between gap-4 mb-0.5">
                        <span style={{ color: p.color }}>{p.name}</span>
                        <span className={`font-bold ${Number(p.value) > 0 ? "text-red-600" : "text-green-600"}`}>
                          {Number(p.value) === 0 ? "clear" : `${p.value} behind`}
                        </span>
                      </div>
                    ))}
                    <p className="text-gray-400 mt-2 border-t border-gray-100 pt-1">
                      Pace: {studentsPerDay}/day · {studentsPerDay * 5} cleared/week
                    </p>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <ReferenceLine y={0} stroke="#10b981" strokeWidth={1.5} />
            {STAFF.map((name) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                name={name === "Nelly Moseki" ? "Nelly" : name === "Adrian D Souza" ? "Adrian" : name === "Program Manager" ? "PM" : name}
                stroke={STAFF_COLORS[name]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Course Assignment Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">Course Assignments</h3>
            <p className="text-xs text-gray-400">Try any distribution — the workload chart updates live.</p>
          </div>
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Reset to Even Split
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="text-left px-5 py-2.5 font-semibold text-gray-700">Course</th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-700">Year</th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-700">Credits</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Current Responsible</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {uniqueCourses.map((course) => {
              const assigned = assignments[course.abbreviation] ?? "Monde";
              const isSSM = assigned === "SSM";
              const isPMYear2 = assigned === "Program Manager" && course.year === 2;
              const isPMOverCount = assigned === "Program Manager" &&
                Object.values(assignments).filter((t) => t === "Program Manager").length > PM_MAX_COURSES;
              const hasCellWarning = isSSM || isPMYear2 || isPMOverCount;
              return (
                <tr
                  key={course.abbreviation}
                  className={`border-b border-gray-100 ${hasCellWarning ? "bg-amber-50/40" : "hover:bg-gray-50"}`}
                >
                  <td className="px-5 py-2.5">
                    <span className="font-medium text-gray-900">{course.name}</span>
                    <span className="text-xs text-gray-400 ml-1.5">{course.abbreviation}</span>
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">Y{course.year}</td>
                  <td className="text-center px-3 py-2.5 text-gray-500">{course.credits ?? "—"}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{course.responsibleTeacher}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={assigned}
                        onChange={(e) => handleAssign(course.abbreviation, e.target.value as StaffName)}
                        className={`border rounded-lg px-2 py-1.5 text-sm bg-white w-44 ${
                          hasCellWarning ? "border-amber-400 ring-1 ring-amber-200" : "border-gray-300"
                        }`}
                      >
                        {STAFF.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {isSSM && (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Not appropriate
                        </span>
                      )}
                      {isPMYear2 && (
                        <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Y2 — PM limit
                        </span>
                      )}
                      {!isPMYear2 && isPMOverCount && (
                        <span className="text-[10px] font-medium text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
                          Over {PM_MAX_COURSES} courses
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary verdict */}
      <div className={`rounded-xl border p-5 ${isViable ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
        <h3 className={`font-bold text-lg mb-2 ${isViable ? "text-green-800" : "text-red-800"}`}>
          {isViable ? "This distribution might work — but consider the SSM constraint." : "This staffing model is not viable."}
        </h3>
        <ul className={`text-sm space-y-1 list-disc list-inside ${isViable ? "text-green-700" : "text-red-700"}`}>
          {overloadedStaff.map((s) => (
            <li key={s.name}>
              <strong>{s.name}</strong> peaks at <strong>{s.peakStudents} students/week</strong> — {s.overloadedWeeks} weeks over the {OVERLOAD_THRESHOLD}-student threshold, with {s.courseCount} courses responsible.
            </li>
          ))}
          {Object.values(assignments).includes("SSM") && (
            <li>
              Courses are assigned to the SSM, whose role is student support — not academic course delivery or marking.
            </li>
          )}
          {pmYear2Violations.length > 0 && (
            <li>
              <strong>Program Manager</strong> is assigned Year 2 courses ({pmYear2Violations.map((c) => c.name).join(", ")}), which is outside the PM's supported scope.
            </li>
          )}
          {pmOverCount && (
            <li>
              <strong>Program Manager</strong> has {pmCourses.length} courses assigned — the maximum is {PM_MAX_COURSES}.
            </li>
          )}
          {!isViable && (
            <li>
              Even with PM support on up to {PM_MAX_COURSES} Year 1 courses, the remaining {uniqueCourses.length - PM_MAX_COURSES}+ courses across {TOTAL_STUDENTS} students cannot be covered by Monde and Nelly alone without exceeding the {OVERLOAD_THRESHOLD}-student/week threshold.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
