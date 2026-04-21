import { useState, useMemo, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from "recharts";
import { courses, teachers } from "../../store";
import { calculateTeacherWorkloads } from "../../utils/schedule";

const WORKLOAD_THRESHOLD = 50;

const TEACHER_COLORS: Record<string, string> = {
  "Martin Kruger": "#6366f1",
  "Marvin Poole": "#f59e0b",
  "Adrian D Souza": "#10b981",
  "Lasse Hægland": "#ef4444",
  "Nelly Moseki": "#8b5cf6",
  "Shabana Jahan": "#ec4899",
};

function getColor(name: string, allNames: string[]): string {
  return (
    TEACHER_COLORS[name] ||
    `hsl(${(allNames.indexOf(name) * 47 + 200) % 360}, 60%, 55%)`
  );
}

export function ScenarioSim() {
  // Course reassignment overrides: courseAbbrev -> teacherName
  const [overrides, setOverrides] = useState<Map<string, string>>(new Map());
  // New teachers added in this simulation
  const [newTeachers, setNewTeachers] = useState<string[]>([]);
  const [newTeacherInput, setNewTeacherInput] = useState("");

  // All available teacher names (original + newly added)
  const allTeacherNames = useMemo(() => {
    const names = teachers.map((t) => t.name);
    for (const nt of newTeachers) {
      if (!names.includes(nt)) names.push(nt);
    }
    return names;
  }, [newTeachers]);

  // Deduplicated courses (INTRO appears twice in data)
  const uniqueCourses = useMemo(() => {
    const seen = new Set<string>();
    return courses.filter((c) => {
      if (seen.has(c.abbreviation)) return false;
      seen.add(c.abbreviation);
      return true;
    });
  }, []);

  const getAssignment = useCallback(
    (abbrev: string) => {
      return overrides.get(abbrev) ?? courses.find((c) => c.abbreviation === abbrev)?.responsibleTeacher ?? "—";
    },
    [overrides]
  );

  const handleReassign = useCallback(
    (abbrev: string, teacher: string) => {
      setOverrides((prev) => {
        const next = new Map(prev);
        const original = courses.find((c) => c.abbreviation === abbrev)?.responsibleTeacher;
        if (teacher === original) {
          next.delete(abbrev);
        } else {
          next.set(abbrev, teacher);
        }
        return next;
      });
    },
    []
  );

  const handleAddTeacher = useCallback(() => {
    const trimmed = newTeacherInput.trim();
    if (trimmed && !allTeacherNames.includes(trimmed)) {
      setNewTeachers((prev) => [...prev, trimmed]);
      setNewTeacherInput("");
    }
  }, [newTeacherInput, allTeacherNames]);

  const handleRemoveNewTeacher = useCallback((name: string) => {
    setNewTeachers((prev) => prev.filter((n) => n !== name));
    // Remove any overrides assigned to this teacher
    setOverrides((prev) => {
      const next = new Map(prev);
      for (const [abbrev, teacher] of next) {
        if (teacher === name) next.delete(abbrev);
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setOverrides(new Map());
    setNewTeachers([]);
    setNewTeacherInput("");
  }, []);

  // Calculate both original and simulated workloads
  const originalWorkloads = useMemo(
    () => calculateTeacherWorkloads(),
    []
  );
  const simulatedWorkloads = useMemo(
    () => calculateTeacherWorkloads(undefined, undefined, overrides),
    [overrides]
  );

  // Comparison chart data
  const comparisonData = useMemo(() => {
    const allNames = new Set<string>();
    for (const w of originalWorkloads) allNames.add(w.teacherName);
    for (const w of simulatedWorkloads) allNames.add(w.teacherName);
    for (const nt of newTeachers) allNames.add(nt);

    return Array.from(allNames)
      .sort()
      .map((name) => {
        const orig = originalWorkloads.find((w) => w.teacherName === name);
        const sim = simulatedWorkloads.find((w) => w.teacherName === name);
        return {
          name: name.split(" ")[0],
          fullName: name,
          original: orig?.peakWeeklyStudents ?? 0,
          simulated: sim?.peakWeeklyStudents ?? 0,
          origCourses: orig?.totalCoursesResponsible ?? 0,
          simCourses: sim?.totalCoursesResponsible ?? 0,
          origOverloaded: orig?.overloadedWeeks ?? 0,
          simOverloaded: sim?.overloadedWeeks ?? 0,
        };
      });
  }, [originalWorkloads, simulatedWorkloads, newTeachers]);

  const hasChanges = overrides.size > 0 || newTeachers.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Course Responsibles
        </h2>
        <p className="text-gray-500 mt-1">
          Reassign courses, add teachers, and preview workload impact.
          Changes are non-persistent.
        </p>
      </div>

      {/* Add New Teacher */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-3">Team Management</h3>
        <div className="flex items-end gap-3 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Add New Teacher
            </label>
            <input
              type="text"
              value={newTeacherInput}
              onChange={(e) => setNewTeacherInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTeacher()}
              placeholder="Enter full name..."
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white w-64"
            />
          </div>
          <button
            onClick={handleAddTeacher}
            disabled={!newTeacherInput.trim()}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add Teacher
          </button>
          {hasChanges && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 ml-auto transition-colors"
            >
              Reset All Changes
            </button>
          )}
        </div>

        {newTeachers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {newTeachers.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-sm font-medium px-3 py-1 rounded-full border border-green-200"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getColor(name, allTeacherNames) }}
                />
                {name}
                <button
                  onClick={() => handleRemoveNewTeacher(name)}
                  className="ml-1 text-green-500 hover:text-red-500 text-xs font-bold"
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Course Reassignment Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">
              Course Assignments
            </h3>
            <p className="text-xs text-gray-400">
              Change the responsible teacher for any course to see workload
              impact
            </p>
          </div>
          {overrides.size > 0 && (
            <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
              {overrides.size} change{overrides.size !== 1 && "s"}
            </span>
          )}
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <th className="text-left px-5 py-2.5 font-semibold text-gray-700">
                Course
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-700">
                Year
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-700">
                Credits
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700">
                Original Teacher
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700">
                Assigned To
              </th>
            </tr>
          </thead>
          <tbody>
            {uniqueCourses.map((course) => {
              const isChanged = overrides.has(course.abbreviation);
              const currentAssignment = getAssignment(course.abbreviation);
              return (
                <tr
                  key={course.abbreviation}
                  className={`border-b border-gray-100 ${isChanged ? "bg-amber-50/50" : "hover:bg-gray-50"}`}
                >
                  <td className="px-5 py-2.5">
                    <span className="font-medium text-gray-900">
                      {course.name}
                    </span>
                    <span className="text-xs text-gray-400 ml-1.5">
                      {course.abbreviation}
                    </span>
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    Y{course.year}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-500">
                    {course.credits}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: getColor(
                            course.responsibleTeacher || "",
                            allTeacherNames
                          ),
                        }}
                      />
                      {course.responsibleTeacher}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <select
                        value={currentAssignment}
                        onChange={(e) =>
                          handleReassign(course.abbreviation, e.target.value)
                        }
                        className={`border rounded-lg px-2 py-1.5 text-sm bg-white w-48 ${
                          isChanged
                            ? "border-amber-400 ring-1 ring-amber-200"
                            : "border-gray-300"
                        }`}
                      >
                        {allTeacherNames.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      {isChanged && (
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                          CHANGED
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

      {/* Comparison Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">
          Workload Comparison: Original vs Simulated
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Peak students per week. Red line = threshold ({WORKLOAD_THRESHOLD}
          students/week).
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={comparisonData} margin={{ bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis tick={{ fontSize: 12 }} axisLine={{ stroke: "#e2e8f0" }} />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.[0]) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-semibold text-gray-900 mb-1">
                      {d.fullName}
                    </p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <span className="text-gray-400">Peak students (orig):</span>
                      <span className="font-medium">{d.original}</span>
                      <span className="text-gray-400">Peak students (sim):</span>
                      <span className="font-medium">{d.simulated}</span>
                      <span className="text-gray-400">Courses:</span>
                      <span>
                        {d.origCourses} → {d.simCourses}
                      </span>
                      <span className="text-gray-400">Weeks over 50:</span>
                      <span>
                        {d.origOverloaded} → {d.simOverloaded}
                      </span>
                    </div>
                    {d.simulated !== d.original && (
                      <p
                        className={`mt-1.5 text-xs font-medium ${d.simulated > d.original ? "text-red-600" : "text-green-600"}`}
                      >
                        {d.simulated > d.original ? "+" : ""}
                        {d.simulated - d.original} change
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar
              dataKey="original"
              name="Original"
              fill="#c7d2fe"
              radius={[4, 4, 0, 0]}
            />
            <Bar dataKey="simulated" name="Simulated" radius={[4, 4, 0, 0]}>
              {comparisonData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={
                    entry.simulated > WORKLOAD_THRESHOLD ? "#ef4444" : "#6366f1"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed comparison table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 text-sm">
            Detailed Impact Summary
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left px-5 py-2.5 font-semibold text-gray-700">
                Teacher
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-700">
                Courses (Orig → Sim)
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-700">
                Peak Students/Wk (Orig → Sim)
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-700">
                Weeks Over 50
              </th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-700">
                Change
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {comparisonData.map((d) => {
              const delta = d.simulated - d.original;
              const exceeded = d.simulated > WORKLOAD_THRESHOLD;
              return (
                <tr
                  key={d.fullName}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="px-5 py-2.5 font-medium text-gray-900">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm mr-2"
                      style={{
                        backgroundColor: getColor(d.fullName, allTeacherNames),
                      }}
                    />
                    {d.fullName}
                    {newTeachers.includes(d.fullName) && (
                      <span className="ml-1.5 text-[10px] font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                        NEW
                      </span>
                    )}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-600">
                    {d.origCourses} → {d.simCourses}
                  </td>
                  <td className="text-center px-3 py-2.5 font-bold text-gray-900">
                    {d.original} → {d.simulated}
                  </td>
                  <td className="text-center px-3 py-2.5 text-gray-600">
                    {d.origOverloaded} → {d.simOverloaded}
                  </td>
                  <td className="text-center px-3 py-2.5">
                    {delta !== 0 ? (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          delta > 0
                            ? "text-red-700 bg-red-50"
                            : "text-green-700 bg-green-50"
                        }`}
                      >
                        {delta > 0 ? "+" : ""}
                        {delta}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {exceeded ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Overloaded
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Normal
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
