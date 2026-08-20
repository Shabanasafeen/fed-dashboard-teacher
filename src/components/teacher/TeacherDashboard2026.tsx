import { useMemo } from "react";
import { courses, schedule } from "../../store";
import {
  getTeacherCurrentCourses,
  getNextCourseStarts,
} from "../../utils/schedule";
import { format, parseISO, startOfWeek } from "date-fns";

const AUG2026_TEACHERS = ["Monde", "Lasse Hægland", "Adrian D Souza"];

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

const AUG2026_OVERRIDES = new Map(Object.entries(AUG2026_RESPONSIBLE));

const AUG2026_SECOND: Record<string, string> = {
  INTRO: "Lasse Hægland",
  DES:   "Lasse Hægland",
  HTML:  "Monde",
  PME:   "Monde",
  SP1:   "Adrian D Souza",
  JS1:   "Monde",
  AGC1:  "Lasse Hægland",
  PE1:   "Adrian D Souza",
  POR1:  "Monde",
  JS2:   "Adrian D Souza",
  WFL:   "Lasse Hægland",
  CSS:   "Adrian D Souza",
  SP2:   "Monde",
  DVP:   "Lasse Hægland",
  JSF:   "Lasse Hægland",
  AGC2:  "Adrian D Souza",
  PE2:   "Monde",
  POR2:  "Adrian D Souza",
};

const AUG2026_THIRD: Record<string, string> = {
  INTRO: "Monde",
  DES:   "Adrian D Souza",
  HTML:  "Lasse Hægland",
  PME:   "Adrian D Souza",
  SP1:   "Monde",
  JS1:   "Adrian D Souza",
  AGC1:  "Monde",
  PE1:   "Lasse Hægland",
  POR1:  "Adrian D Souza",
  JS2:   "Monde",
  WFL:   "Adrian D Souza",
  CSS:   "Lasse Hægland",
  SP2:   "Lasse Hægland",
  DVP:   "Adrian D Souza",
  JSF:   "Monde",
  AGC2:  "Lasse Hægland",
  PE2:   "Lasse Hægland",
  POR2:  "Monde",
};

const AUG2026_SECOND_MAP = new Map(Object.entries(AUG2026_SECOND));
const AUG2026_THIRD_MAP = new Map(Object.entries(AUG2026_THIRD));

interface Props {
  selectedTeacher: string;
  onTeacherChange: (name: string) => void;
}

export function TeacherDashboard2026({ selectedTeacher, onTeacherChange }: Props) {

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
    .toISOString()
    .slice(0, 10);

  const currentCourses = useMemo(
    () => getTeacherCurrentCourses(selectedTeacher, today, AUG2026_OVERRIDES, AUG2026_SECOND_MAP, AUG2026_THIRD_MAP),
    [selectedTeacher, today]
  );

  const nextStarts = useMemo(
    () => getNextCourseStarts(selectedTeacher, 3, today, AUG2026_OVERRIDES),
    [selectedTeacher, today]
  );

  // Course order as they appear in the programme
  const COURSE_ORDER = ["INTRO","DES","HTML","PME","SP1","JS1","AGC1","PE1","POR1","JS2","WFL","CSS","SP2","DVP","JSF","AGC2","PE2","POR2"];

  const courseScheduleOverview = useMemo(() => {
    const seen = new Set<string>();
    const result: {
      courseAbbrev: string;
      courseName: string;
      role: "responsible" | "2nd" | "3rd";
      currentIntakes: string[];
      nextStarts: { intakeId: string; date: string }[];
    }[] = [];

    for (const abbrev of COURSE_ORDER) {
      if (seen.has(abbrev)) continue;
      const responsible = AUG2026_RESPONSIBLE[abbrev];
      const second = AUG2026_SECOND[abbrev];
      const third = AUG2026_THIRD[abbrev];

      let role: "responsible" | "2nd" | "3rd" | null = null;
      if (responsible?.toLowerCase() === selectedTeacher.toLowerCase()) role = "responsible";
      else if (second?.toLowerCase() === selectedTeacher.toLowerCase()) role = "2nd";
      else if (third?.toLowerCase() === selectedTeacher.toLowerCase()) role = "3rd";
      if (!role) continue;

      seen.add(abbrev);
      const course = courses.find((c) => c.abbreviation === abbrev);
      const courseName = course?.name ?? abbrev;

      const currentIntakes = currentCourses.find((cc) => cc.courseAbbrev === abbrev)?.intakes ?? [];

      const upcoming: { intakeId: string; date: string }[] = [];
      for (const entry of schedule) {
        if (entry.courseAbbrev === abbrev && entry.isCourseStart && entry.weekDate > today) {
          upcoming.push({ intakeId: entry.intake, date: entry.weekDate });
        }
      }
      upcoming.sort((a, b) => a.date.localeCompare(b.date));

      result.push({ courseAbbrev: abbrev, courseName, role, currentIntakes, nextStarts: upcoming });
    }
    return result;
  }, [selectedTeacher, currentCourses, today]);

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
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
            Aug 2026
          </span>
        </div>
        <p className="text-gray-500 mt-1">
          Current and upcoming course information — Monde, Lasse &amp; Adrian
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select Teacher
        </label>
        <select
          value={selectedTeacher}
          onChange={(e) => onTeacherChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[250px]"
        >
          {AUG2026_TEACHERS.map((name) => (
            <option key={name} value={name}>
              {name}
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
                            {AUG2026_SECOND[item.courseAbbrev] && (
                              <p><span className="text-gray-400">2nd:</span> {AUG2026_SECOND[item.courseAbbrev]}</p>
                            )}
                            {AUG2026_THIRD[item.courseAbbrev] && (
                              <p><span className="text-gray-400">3rd:</span> {AUG2026_THIRD[item.courseAbbrev]}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

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
                      const responsible = AUG2026_RESPONSIBLE[cc.courseAbbrev] || course?.responsibleTeacher;
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
                                  {responsible || "—"}
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

      {/* Course schedule overview */}
      {courseScheduleOverview.length > 0 && (
        <div className="mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Course Schedule Overview</h3>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600 w-8">#</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Course</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Next Start</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {courseScheduleOverview.map((item, i) => {
                  const roleBadge =
                    item.role === "responsible"
                      ? "bg-indigo-100 text-indigo-700"
                      : item.role === "2nd"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-pink-100 text-pink-700";
                  const roleLabel =
                    item.role === "responsible" ? "Resp." : item.role === "2nd" ? "2nd" : "3rd";
                  const isRunning = item.currentIntakes.length > 0;
                  const next = item.nextStarts[0];
                  return (
                    <tr key={item.courseAbbrev} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <span className="font-medium text-gray-900">{item.courseName}</span>
                        <span className="ml-2 text-xs text-gray-400">{item.courseAbbrev}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadge}`}>
                          {roleLabel}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {isRunning ? (
                          <span className="inline-flex items-center gap-1.5 text-green-700 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Running — {item.currentIntakes.join(", ")}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Not running</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {next ? (
                          <span className="text-gray-700 text-xs">
                            <span className="font-medium">{format(parseISO(next.date), "MMM d, yyyy")}</span>
                            <span className="text-gray-400 ml-1">({next.intakeId})</span>
                          </span>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
