import { useState, useMemo } from "react";
import { teachers, courses } from "../../store";
import {
  getTeacherCurrentCourses,
  getNextCourseStart,
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

  const nextStart = useMemo(
    () => getNextCourseStart(selectedTeacher, today),
    [selectedTeacher, today]
  );

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
                { role: "responsible", label: "Responsible", badge: "bg-indigo-100 text-indigo-700", header: "bg-indigo-50 border-indigo-200" },
                { role: "2nd", label: "2nd Substitute", badge: "bg-yellow-100 text-yellow-700", header: "bg-yellow-50 border-yellow-200" },
                { role: "3rd", label: "3rd Substitute", badge: "bg-pink-100 text-pink-700", header: "bg-pink-50 border-pink-200" },
              ] as const
            ).map(({ role, label, badge, header }) => {
              const group = currentCourses.filter((cc) => cc.role === role);
              if (group.length === 0) return null;
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
                        <div key={cc.courseAbbrev} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-gray-900">{cc.courseName}</h4>
                            <a
                              href="https://google.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors shrink-0 ml-2"
                            >
                              Open Moodle
                            </a>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              <span className="text-gray-400">Intakes:</span>{" "}
                              {cc.intakes.join(", ")}
                            </p>
                            {course && (
                              <>
                                <p>
                                  <span className="text-gray-400">2nd Teacher:</span>{" "}
                                  {course.secondTeacher || "—"}
                                </p>
                                <p>
                                  <span className="text-gray-400">3rd Teacher:</span>{" "}
                                  {course.thirdTeacher || "—"}
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

      {/* Next course start */}
      {nextStart && (
        <div className="mb-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Next course start:</span>{" "}
            {nextStart.courseName} on{" "}
            {format(parseISO(nextStart.startDate), "MMMM d, yyyy")} (
            {nextStart.intake})
          </p>
        </div>
      )}



    </div>
  );
}
