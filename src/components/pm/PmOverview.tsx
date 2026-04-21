import { useState, useMemo } from "react";
import {
  getActiveIntakes,
  getAllIntakesWithStudents,
  courses,
  teachers,
  getUniqueStudyPlans,
  schedule,
  getCourseName,
  intakes,
} from "../../store";
import { format, startOfWeek } from "date-fns";

export function PmOverview() {
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const studyPlans = getUniqueStudyPlans();

  const filteredIntakes = useMemo(() => {
    return getActiveIntakes().filter((i) => {
      if (selectedPlan !== "all" && i.studyPlan !== selectedPlan) return false;
      if (selectedType !== "all" && i.type !== selectedType) return false;
      return true;
    });
  }, [selectedPlan, selectedType]);

  const totalStudents = filteredIntakes.reduce(
    (sum, i) => sum + i.studentCount,
    0
  );

  const activeCourseAbbrevs = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const abbrevs = new Set<string>();
    for (const entry of schedule) {
      if (entry.weekDate === today) {
        abbrevs.add(entry.courseAbbrev);
      }
    }
    return abbrevs.size;
  }, []);

  const activeTeachers = teachers.filter(
    (t) => t.coursesResponsible > 0 || t.courses2nd > 0 || t.courses3rd > 0
  );

  // Current active classes: which intakes are running which course this week, and who's responsible
  const activeClasses = useMemo(() => {
    const today = new Date();
    const weekStart = format(
      startOfWeek(today, { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );

    // Find the closest schedule week date (schedules are Monday-based)
    const allWeekDates = [...new Set(schedule.map((s) => s.weekDate))].sort();
    let matchDate = weekStart;
    // Find the schedule week that contains today
    for (const d of allWeekDates) {
      if (d <= format(today, "yyyy-MM-dd")) matchDate = d;
      else break;
    }

    const entries = schedule.filter((s) => s.weekDate === matchDate);
    // Group by course abbreviation
    const courseMap = new Map<
      string,
      { intakes: string[]; isAssignment: boolean }
    >();
    for (const e of entries) {
      if (!courseMap.has(e.courseAbbrev)) {
        courseMap.set(e.courseAbbrev, { intakes: [], isAssignment: false });
      }
      const cm = courseMap.get(e.courseAbbrev)!;
      cm.intakes.push(e.intake);
      if (e.isAssignmentWeek) cm.isAssignment = true;
    }

    return Array.from(courseMap.entries()).map(([abbrev, data]) => {
      const course = courses.find((c) => c.abbreviation === abbrev);
      const intakeDetails = data.intakes.map((id) => {
        const intake = intakes.find((i) => i.id === id);
        return { id, students: intake?.studentCount ?? 0, type: intake?.type ?? "" };
      });
      const totalStudents = intakeDetails.reduce((s, i) => s + i.students, 0);
      return {
        abbrev,
        courseName: getCourseName(abbrev),
        responsible: course?.responsibleTeacher ?? "—",
        secondTeacher: course?.secondTeacher ?? "—",
        intakes: intakeDetails,
        totalStudents,
        isAssignment: data.isAssignment,
      };
    }).sort((a, b) => b.totalStudents - a.totalStudents);
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Program Overview</h2>
        <p className="text-gray-500 mt-1">
          High-level view of the FED program
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <select
          value={selectedPlan}
          onChange={(e) => setSelectedPlan(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="all">All Study Plans</option>
          {studyPlans.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="all">All Types</option>
          <option value="FT">Full-time</option>
          <option value="PT">Part-time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="Active Intakes"
          value={filteredIntakes.length}
          subtitle={`${getAllIntakesWithStudents().length} total (incl. completed)`}
          color="bg-blue-500"
        />
        <KpiCard
          title="Active Students"
          value={totalStudents}
          subtitle="in currently running intakes only"
          color="bg-emerald-500"
        />
        <KpiCard
          title="Courses in Curriculum"
          value={courses.length}
          subtitle={`${activeCourseAbbrevs} active today`}
          color="bg-purple-500"
        />
        <KpiCard
          title="Active Teachers"
          value={activeTeachers.length}
          subtitle="with course assignments"
          color="bg-amber-500"
        />
      </div>

      {/* Current Active Classes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">
              Active Classes This Week
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Current courses running across all intakes, with responsible
              teacher
            </p>
          </div>
          <span className="text-xs font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
            {activeClasses.length} active courses
          </span>
        </div>
        {activeClasses.length === 0 ? (
          <p className="text-gray-500 text-sm py-4 text-center">
            No active classes this week (may be a holiday or between semesters)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">
                    Course
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-700">
                    Responsible Teacher
                  </th>
                  <th className="text-left px-3 py-2.5 font-semibold text-gray-700">
                    Active Intakes
                  </th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-700">
                    Total Students
                  </th>
                  <th className="text-center px-3 py-2.5 font-semibold text-gray-700">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeClasses.map((ac) => (
                  <tr
                    key={ac.abbrev}
                    className={`border-b border-gray-100 ${ac.isAssignment ? "bg-red-50/40" : "hover:bg-gray-50"}`}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-900">
                        {ac.courseName}
                      </span>
                      <span className="text-xs text-gray-400 ml-1.5">
                        ({ac.abbrev})
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium text-indigo-700">
                        {ac.responsible}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        2nd: {ac.secondTeacher}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {ac.intakes.map((i) => (
                          <span
                            key={i.id}
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                              i.type === "FT"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-orange-100 text-orange-700"
                            }`}
                          >
                            {i.id}
                            <span className="text-gray-400 ml-0.5">
                              ({i.students})
                            </span>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span
                        className={`font-bold ${ac.totalStudents > 50 ? "text-red-600" : "text-gray-900"}`}
                      >
                        {ac.totalStudents}
                      </span>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {ac.isAssignment ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          Submissions Week
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Teaching
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Intakes by Type</h3>
          <div className="space-y-2">
            {filteredIntakes.map((intake) => (
              <div
                key={intake.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      intake.type === "FT"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {intake.type}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {intake.id}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{intake.studyPlan}</span>
                  <span className="font-medium text-gray-700">
                    {intake.studentCount} students
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: number;
  subtitle: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${color}`} />
      </div>
    </div>
  );
}
