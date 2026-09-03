import { useMemo } from "react";
import { courses, schedule } from "../../store";
import { getTeacherCurrentCourses } from "../../utils/schedule";
import { format, parseISO } from "date-fns";

const AUG2026_TEACHERS = ["Monde", "Lasse Hægland", "Adrian D Souza"];

const AUG2026_RESPONSIBLE: Record<string, string> = {
  INTRO: "Shabana Jahan",
  DES:   "Monde",
  HTML:  "Adrian D Souza",
  PME:   "Lasse Hægland",
  SP1:   "Lasse Hægland",
  JS1:   "Lasse Hægland",
  AGC1:  "Adrian D Souza",
  PE1:   "Monde",
  POR1:  "Lasse Hægland",
  JS2:   "Lasse Hægland",
  WFL:   "Monde",
  CSS:   "Monde",
  SP2:   "Adrian D Souza",
  DVP:   "Monde",
  JSF:   "Adrian D Souza",
  AGC2:  "Monde",
  PE2:   "Adrian D Souza",
  POR2:  "Lasse Hægland",
};

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

const AUG2026_OVERRIDES = new Map(Object.entries(AUG2026_RESPONSIBLE));
const AUG2026_SECOND_MAP = new Map(Object.entries(AUG2026_SECOND));
const AUG2026_THIRD_MAP = new Map(Object.entries(AUG2026_THIRD));

const COURSE_ORDER = ["INTRO","DES","HTML","PME","SP1","JS1","AGC1","PE1","POR1","JS2","WFL","CSS","SP2","DVP","JSF","AGC2","PE2","POR2"];

interface Props {
  selectedTeacher: string;
  onTeacherChange: (name: string) => void;
}

export function CourseScheduleAug2026({ selectedTeacher, onTeacherChange }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const currentCourses = useMemo(
    () => getTeacherCurrentCourses(selectedTeacher, today, AUG2026_OVERRIDES, AUG2026_SECOND_MAP, AUG2026_THIRD_MAP),
    [selectedTeacher, today]
  );

  const overview = useMemo(() => {
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

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h2 className="text-2xl font-bold text-gray-900">Course Schedule</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700">
            Aug 2026
          </span>
        </div>
        <p className="text-gray-500 mt-1">
          All courses with current status and upcoming start dates
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher</label>
        <select
          value={selectedTeacher}
          onChange={(e) => onTeacherChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[250px]"
        >
          {AUG2026_TEACHERS.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-8">#</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Course</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Next Start</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {overview.map((item, i) => {
              const roleBadge =
                item.role === "responsible"
                  ? "bg-indigo-100 text-indigo-700"
                  : item.role === "2nd"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-pink-100 text-pink-700";
              const roleLabel =
                item.role === "responsible" ? "Responsible" : item.role === "2nd" ? "2nd" : "3rd";
              const isRunning = item.currentIntakes.length > 0;
              const next = item.nextStarts[0];
              return (
                <tr key={item.courseAbbrev} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{item.courseName}</span>
                    <span className="ml-2 text-xs text-gray-400">{item.courseAbbrev}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleBadge}`}>
                      {roleLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {isRunning ? (
                      <span className="inline-flex items-center gap-1.5 text-green-700 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        Running — {item.currentIntakes.join(", ")}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">Not running</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
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

      {/* Evaluation Review Windows */}
      <div className="mt-8">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900">Course Evaluation Review Windows</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Evaluation meetings held once per semester during project periods — August 2026 intakes only
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              intake: "AUG26FT",
              label: "Full Time",
              windows: [
                { semester: "Semester 1", course: "SP1", start: "2026-11-16", end: "2026-12-07" },
                { semester: "Semester 2", course: "PE1", start: "2027-04-12", end: "2027-05-17" },
                { semester: "Semester 3", course: "SP2", start: "2027-11-08", end: "2027-12-06" },
                { semester: "Semester 4", course: "PE2", start: "2028-04-10", end: "2028-05-15" },
              ],
            },
          ].map(({ intake, label, windows }) => (
            <div key={intake} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <span className="font-semibold text-gray-800 text-sm">{intake}</span>
                <span className="text-xs text-gray-500">{label}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {windows.map(({ semester, course, start, end }) => {
                  const today = new Date().toISOString().slice(0, 10);
                  const isActive = today >= start && today <= end;
                  const isPast = today > end;
                  const statusBadge = isActive
                    ? "bg-green-100 text-green-700"
                    : isPast
                    ? "bg-gray-100 text-gray-400"
                    : "bg-blue-50 text-blue-600";
                  const statusLabel = isActive ? "Now" : isPast ? "Done" : "Upcoming";
                  return (
                    <div key={semester} className="px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{semester}</span>
                          <span className="text-xs text-gray-400">during {course}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {format(parseISO(start), "d MMM yyyy")} — {format(parseISO(end), "d MMM yyyy")}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadge}`}>
                        {statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
