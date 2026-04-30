import { useState, useMemo } from "react";
import { teachers, courses, schedule } from "../../store";
import {
  getTeacherCurrentCourses,
  getNextCourseStarts,
} from "../../utils/schedule";
import { format, parseISO, startOfWeek } from "date-fns";

export function TeacherDashboard() {
  const [selectedTeacher, setSelectedTeacher] = useState(
    teachers[0]?.name || ""
  );

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    .toISOString()
    .slice(0, 10);

  const currentCourses = useMemo(
    () => getTeacherCurrentCourses(selectedTeacher, today),
    [selectedTeacher, today]
  );

  const nextStarts = useMemo(
    () => getNextCourseStarts(selectedTeacher, 3, today),
    [selectedTeacher, today]
  );

  // For a given intake+course, return { currentWeek, totalWeeks }
  function getCourseWeek(intakeId: string, courseAbbrev: string) {
    const entries = schedule
      .filter((e) => e.intake === intakeId && e.courseAbbrev === courseAbbrev)
      .sort((a, b) => a.weekDate.localeCompare(b.weekDate));
    const totalWeeks = entries.length;
    const currentWeek = entries.filter((e) => e.weekDate <= today).length;
    return { currentWeek, totalWeeks };
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h2>
        <p className="text-gray-500 mt-1">
          Current and upcoming course information
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Teacher
        </label>
        <select
          value={selectedTeacher}
          onChange={(e) => setSelectedTeacher(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[250px]"
        >
          {teachers.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Current courses */}
      <div className="mb-6">
        <h3 className="font-semibold text-gray-900 mb-4">
          Current Course(s) — Week of {weekStart}
        </h3>
        {currentCourses.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500">
            No active courses this week
          </div>
        ) : (
          <div className="space-y-6">
            {(
              [
                { role: "responsible", label: "Responsible", badge: "bg-indigo-100 text-indigo-700", header: "bg-indigo-50 border-indigo-200", cardBorder: "border-indigo-200" },
                { role: "2nd", label: "2nd Substitute", badge: "bg-yellow-100 text-yellow-700", header: "bg-yellow-50 border-yellow-200", cardBorder: "border-yellow-200" },
                { role: "3rd", label: "3rd Substitute", badge: "bg-pink-100 text-pink-700", header: "bg-pink-50 border-pink-200", cardBorder: "border-pink-200" },
              ] as const
            ).map(({ role, label, badge, header, cardBorder }) => {
              const group = currentCourses.filter((cc) => cc.role === role);
              if (group.length === 0) return null;

              // For responsible: one card per intake
              // For 2nd/3rd: keep original one-card-per-course layout
              if (role === "responsible") {
                const intakeCards = group.flatMap((cc) =>
                  cc.intakes.map((intakeId) => {
                    const { currentWeek, totalWeeks } = getCourseWeek(intakeId, cc.courseAbbrev);
                    const pct = totalWeeks > 0 ? Math.round((currentWeek / totalWeeks) * 100) : 0;
                    const course = courses.find((c) => c.abbreviation === cc.courseAbbrev);
                    return { ...cc, intakeId, currentWeek, totalWeeks, pct, course };
                  })
                );

                return (
                  <div key={role}>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border mb-3 ${header}`}>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${badge}`}>
                        {label}
                      </span>
                      <span className="text-sm text-gray-500">{intakeCards.length} intake{intakeCards.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {intakeCards.map((item) => (
                        <div key={`${item.courseAbbrev}-${item.intakeId}`} className={`bg-white rounded-xl shadow-sm border ${cardBorder} p-5`}>
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900 text-sm">{item.courseName}</h4>
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full shrink-0 ml-2">
                              {item.intakeId}
                            </span>
                          </div>

                          {/* Week progress */}
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Week {item.currentWeek} of {item.totalWeeks}</span>
                              <span>{item.pct}%</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-indigo-500 transition-all"
                                style={{ width: `${item.pct}%` }}
                              />
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 space-y-0.5">
                            {item.course?.secondTeacher && (
                              <p><span className="text-gray-400">2nd:</span> {item.course.secondTeacher}</p>
                            )}
                            {item.course?.thirdTeacher && (
                              <p><span className="text-gray-400">3rd:</span> {item.course.thirdTeacher}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // 2nd / 3rd substitute — original layout
              return (
                <div key={role}>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border mb-3 ${header}`}>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${badge}`}>
                      {label}
                    </span>
                    <span className="text-sm text-gray-500">{group.length} course{group.length > 1 ? "s" : ""}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.map((cc) => {
                      const course = courses.find((c) => c.abbreviation === cc.courseAbbrev);
                      return (
                        <div key={cc.courseAbbrev} className={`bg-white rounded-xl shadow-sm border ${cardBorder} p-5`}>
                          <h4 className="font-semibold text-gray-900 mb-2">{cc.courseName}</h4>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              <span className="text-gray-400">Intakes:</span>{" "}
                              {cc.intakes.join(", ")}
                            </p>
                            {course && (
                              <>
                                <p>
                                  <span className="text-gray-400">Responsible:</span>{" "}
                                  {course.responsibleTeacher || "—"}
                                </p>
                                <p>
                                  <span className="text-gray-400">Credits:</span>{" "}
                                  {course.credits} |{" "}
                                  <span className="text-gray-400">Weeks (FT):</span>{" "}
                                  {course.weeksFT}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming course starts */}
      {nextStarts.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Upcoming Course Starts</h3>
          <div className="space-y-2">
            {nextStarts.map((ns, i) => (
              <div
                key={`${ns.intake}-${ns.startDate}`}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                  i === 0
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full ${
                    i === 0 ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"
                  }`}>
                    {i + 1}
                  </span>
                  <span className={`font-medium text-sm ${i === 0 ? "text-blue-900" : "text-gray-700"}`}>
                    {ns.courseName}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    i === 0 ? "bg-blue-100 text-blue-600" : "bg-gray-200 text-gray-500"
                  }`}>
                    {ns.intake}
                  </span>
                </div>
                <span className={`text-sm ${i === 0 ? "text-blue-700 font-semibold" : "text-gray-500"}`}>
                  {format(parseISO(ns.startDate), "MMM d, yyyy")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
