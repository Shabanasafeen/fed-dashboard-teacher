import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  calculateTeacherWorkloads,
  getWeeklyWorkloadBreakdown,
} from "../../utils/schedule";
import { format, parseISO, addWeeks } from "date-fns";

const WORKLOAD_THRESHOLD = 50;

const TEACHER_COLORS: Record<string, string> = {
  "Martin Kruger": "#6366f1",
  "Marvin Poole": "#f59e0b",
  "Adrian D Souza": "#10b981",
  "Lasse Hægland": "#ef4444",
  "Nelly Moseki": "#8b5cf6",
  "Shabana Jahan": "#ec4899",
};

export function WorkloadChart() {
  const workloads = useMemo(() => calculateTeacherWorkloads(), []);

  const chartData = workloads.map((w) => ({
    name: w.teacherName.split(" ")[0],
    fullName: w.teacherName,
    courses: w.totalCoursesResponsible,
    teaching: w.peakTeachingStudents,
    marking: w.peakMarkingStudents,
    peakStudents: w.peakWeeklyStudents,
    peakWeekDate: w.peakWeekDate,
    peakTeachingDate: w.peakTeachingWeekDate,
    peakMarkingDate: w.peakMarkingWeekDate,
    peakCourses: w.peakWeekCourses,
    overloadedWeeks: w.overloadedWeeks,
    grading: w.assignmentGradingCount,
  }));

  // Weekly breakdown state
  const today = new Date().toISOString().slice(0, 10);
  const defaultEnd = format(addWeeks(new Date(), 12), "yyyy-MM-dd");
  const [weeklyFrom, setWeeklyFrom] = useState(today);
  const [weeklyTo, setWeeklyTo] = useState(defaultEnd);
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null);

  const weeklyData = useMemo(
    () => getWeeklyWorkloadBreakdown(weeklyFrom, weeklyTo),
    [weeklyFrom, weeklyTo]
  );

  // Build stacked bar chart data for weekly view
  const teacherNames = useMemo(() => {
    const names = new Set<string>();
    for (const w of weeklyData) {
      for (const t of w.teachers) names.add(t.name);
    }
    return Array.from(names).sort();
  }, [weeklyData]);

  const weeklyChartData = useMemo(() => {
    return weeklyData.map((w) => {
      const row: Record<string, string | number> = {
        week: w.calendarWeek.replace("Week ", "W"),
        weekDate: w.weekDate,
      };
      for (const t of w.teachers) {
        row[t.name] = t.totalStudents;
      }
      // Fill missing teachers with 0
      for (const name of teacherNames) {
        if (!(name in row)) row[name] = 0;
      }
      return row;
    });
  }, [weeklyData, teacherNames]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Teacher Workload Comparison
        </h2>
        <p className="text-gray-500 mt-1">
          Workload based on courses, students, and assignment grading
        </p>
      </div>

      {/* Teaching vs Marking load chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-1">
          Peak Weekly Load by Teacher — Teaching vs Marking
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-indigo-500 mr-1" />Teaching: students in active courses that week.{"  "}
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-400 mr-1 ml-2" />Marking: students whose assignments are within the 19-day grading window.
          Red line = {WORKLOAD_THRESHOLD} student threshold.
        </p>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={chartData} margin={{ bottom: 20, top: 20 }} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={{ stroke: "#e2e8f0" }} />
            <YAxis tick={{ fontSize: 12 }} axisLine={{ stroke: "#e2e8f0" }} />
            <ReferenceLine y={WORKLOAD_THRESHOLD} stroke="#ef4444" strokeDasharray="4 2" label={{ value: `${WORKLOAD_THRESHOLD} limit`, position: "right", fontSize: 10, fill: "#ef4444" }} />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                const combined = d.teaching + d.marking;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-semibold text-gray-900 mb-2">{d.fullName}</p>
                    <p className="text-indigo-700">
                      Teaching: <strong>{d.teaching}</strong> students
                      {d.peakTeachingDate && <span className="text-gray-400 ml-1">({format(parseISO(d.peakTeachingDate), "MMM d, yyyy")})</span>}
                    </p>
                    <p className="text-amber-600 mt-1">
                      Marking: <strong>{d.marking}</strong> students
                      {d.peakMarkingDate && <span className="text-gray-400 ml-1">({format(parseISO(d.peakMarkingDate), "MMM d, yyyy")})</span>}
                    </p>
                    <p className={`font-semibold mt-1.5 pt-1.5 border-t border-gray-100 ${combined > WORKLOAD_THRESHOLD ? "text-red-600" : "text-gray-700"}`}>
                      Peak combined: <strong>{combined}</strong> students
                      {combined > WORKLOAD_THRESHOLD ? " — exceeds threshold" : " — within threshold"}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">Overloaded weeks: {d.overloadedWeeks}</p>
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="square" iconSize={10} />
            <Bar dataKey="teaching" name="Teaching" fill="#6366f1" radius={[0, 0, 0, 0]} stackId="load">
              <LabelList dataKey="teaching" position="insideTop" style={{ fontSize: 11, fill: "#fff", fontWeight: 600 }} />
            </Bar>
            <Bar dataKey="marking" name="Marking" fill="#f59e0b" radius={[4, 4, 0, 0]} stackId="load">
              <LabelList dataKey="marking" position="top" style={{ fontSize: 11, fill: "#d97706", fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Breakdown Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">
          Weekly Workload Breakdown
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Students per teacher per week. Helps identify overloaded weeks for
          planning.
        </p>

        <div className="flex items-center gap-3 mb-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={weeklyFrom}
              onChange={(e) => setWeeklyFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={weeklyTo}
              onChange={(e) => setWeeklyTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
            />
          </div>
          <div className="ml-3 text-sm text-gray-500 self-end pb-1">
            {weeklyData.length} weeks shown
          </div>
        </div>

        {/* Stacked bar chart */}
        {weeklyChartData.length > 0 && (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart
              data={weeklyChartData}
              margin={{ bottom: 40, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                axisLine={{ stroke: "#e2e8f0" }}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={{ stroke: "#e2e8f0" }}
                label={{
                  value: "Students",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "#9ca3af" },
                }}
              />
              <Tooltip
                content={({ payload, label }) => {
                  if (!payload || payload.length === 0) return null;
                  const weekDate = payload[0]?.payload?.weekDate;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm max-w-xs">
                      <p className="font-semibold text-gray-900 mb-1">
                        {label}{" "}
                        {weekDate && (
                          <span className="font-normal text-gray-400">
                            ({format(parseISO(weekDate), "MMM d")})
                          </span>
                        )}
                      </p>
                      {payload
                        .filter((p) => (p.value as number) > 0)
                        .map((p) => (
                          <p key={p.dataKey as string} className="text-gray-600">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-sm mr-1.5"
                              style={{ backgroundColor: p.fill }}
                            />
                            {String(p.dataKey)}: {p.value} students
                          </p>
                        ))}
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                iconSize={10}
                iconType="square"
              />
              {teacherNames.map((name) => (
                <Bar
                  key={name}
                  dataKey={name}
                  stackId="teachers"
                  fill={
                    TEACHER_COLORS[name] ||
                    `hsl(${(teacherNames.indexOf(name) * 60) % 360}, 65%, 55%)`
                  }
                  radius={
                    name === teacherNames[teacherNames.length - 1]
                      ? [3, 3, 0, 0]
                      : [0, 0, 0, 0]
                  }
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Weekly detail table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 text-sm">
            Weekly Detail Table
          </h3>
          <p className="text-xs text-gray-400">
            Click a week to expand and see course-level details per teacher
          </p>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">
                  Week
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-700">
                  Date
                </th>
                {teacherNames.map((name) => (
                  <th
                    key={name}
                    className="text-center px-2 py-2.5 font-semibold text-gray-700"
                  >
                    <span className="text-xs">
                      {name.split(" ")[0]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeklyData.map((w) => {
                const isExpanded = expandedWeek === w.weekDate;
                return (
                  <WeekRow
                    key={w.weekDate}
                    week={w}
                    teacherNames={teacherNames}
                    isExpanded={isExpanded}
                    onToggle={() =>
                      setExpandedWeek(isExpanded ? null : w.weekDate)
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overall summary table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 font-semibold text-gray-700">
                Teacher
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-700">
                Courses
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-700">
                Peak Students/Week
              </th>
              <th className="text-center px-3 py-3 font-semibold text-gray-700">
                Assignment Weeks
              </th>
              <th className="text-left px-3 py-3 font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {workloads.map((w) => {
              const exceeded = w.peakWeeklyStudents > WORKLOAD_THRESHOLD;
              return (
                <tr
                  key={w.teacherName}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-5 py-3 font-medium text-gray-900">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm mr-2"
                      style={{
                        backgroundColor:
                          TEACHER_COLORS[w.teacherName] || "#94a3b8",
                      }}
                    />
                    {w.teacherName}
                  </td>
                  <td className="text-center px-3 py-3 text-gray-600">
                    {w.totalCoursesResponsible}
                  </td>
                  <td className="text-center px-3 py-3">
                    <span
                      className={`font-bold ${exceeded ? "text-red-600" : "text-indigo-600"}`}
                    >
                      {w.peakWeeklyStudents}
                    </span>
                    {w.peakWeekDate && (
                      <span className="text-[10px] text-gray-400 block">
                        {format(parseISO(w.peakWeekDate), "MMM d")}
                      </span>
                    )}
                  </td>
                  <td className="text-center px-3 py-3 text-gray-600">
                    {w.assignmentGradingCount}
                  </td>
                  <td className="px-3 py-3">
                    {exceeded ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Over {WORKLOAD_THRESHOLD}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

      </div>
    </div>
  );
}

function WeekRow({
  week,
  teacherNames,
  isExpanded,
  onToggle,
}: {
  week: ReturnType<typeof getWeeklyWorkloadBreakdown>[number];
  teacherNames: string[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const teacherMap = new Map(week.teachers.map((t) => [t.name, t]));

  return (
    <>
      <tr
        className={`border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${isExpanded ? "bg-indigo-50/50" : ""}`}
        onClick={onToggle}
      >
        <td className="px-4 py-2.5 font-medium text-gray-900">
          <span className="mr-1.5 text-gray-400 text-xs">
            {isExpanded ? "▼" : "▶"}
          </span>
          {week.calendarWeek}
        </td>
        <td className="px-3 py-2.5 text-gray-500 text-xs">
          {format(parseISO(week.weekDate), "MMM d, yyyy")}
        </td>
        {teacherNames.map((name) => {
          const teacher = teacherMap.get(name);
          if (!teacher) {
            return (
              <td
                key={name}
                className="text-center px-2 py-2.5 text-gray-300"
              >
                —
              </td>
            );
          }
          return (
            <td key={name} className="text-center px-2 py-2.5">
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-semibold text-gray-900 text-xs">
                  {teacher.totalStudents}
                </span>
                <span className="text-[10px] text-gray-400">
                  <span className="text-indigo-500">T:{teacher.teachingStudents}</span>
                  {" "}<span className="text-amber-500">M:{teacher.markingStudents}</span>
                </span>
                <span className="text-[10px] text-gray-400">
                  {teacher.courses.length}c / {teacher.totalIntakes}i
                </span>
                {teacher.hasGrading && (
                  <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1 rounded">
                    Submissions
                  </span>
                )}
              </div>
            </td>
          );
        })}
      </tr>
      {isExpanded && (
        <tr className="bg-indigo-50/30 border-b border-gray-200">
          <td colSpan={2 + teacherNames.length} className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {week.teachers.map((t) => (
                <div
                  key={t.name}
                  className="bg-white rounded-lg border border-gray-200 p-3"
                >
                  <p className="font-medium text-gray-900 text-sm mb-2 flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{
                        backgroundColor:
                          TEACHER_COLORS[t.name] || "#94a3b8",
                      }}
                    />
                    {t.name}
                    <span className="text-xs text-gray-400 font-normal ml-auto">
                      {t.totalStudents} students total
                    </span>
                  </p>
                  {t.courses.map((c) => (
                    <div
                      key={c.abbrev}
                      className="text-xs py-1.5 border-t border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">
                          {c.courseName}
                        </span>
                        {c.isAssignmentWeek && (
                          <span className="text-[9px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                            Submissions Week
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 mt-0.5">
                        {c.intakes.join(", ")} — {c.studentCount} students
                      </p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
