import { useState, useMemo } from "react";
import { courses } from "../../store";

const TEACHER_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Shabana Jahan":  { bg: "bg-violet-100",  text: "text-violet-800",  dot: "bg-violet-500"  },
  "Martin Kruger":  { bg: "bg-pink-100",    text: "text-pink-800",    dot: "bg-pink-500"    },
  "Marvin Poole":   { bg: "bg-orange-100",  text: "text-orange-800",  dot: "bg-orange-500"  },
  "Lasse Hægland":  { bg: "bg-teal-100",    text: "text-teal-800",    dot: "bg-teal-500"    },
  "Adrian D Souza": { bg: "bg-blue-100",    text: "text-blue-800",    dot: "bg-blue-500"    },
  "Nelly Moseki":   { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
};
const DEFAULT_COLOR = { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" };

function TeacherBadge({ name, label }: { name: string | null; label?: string }) {
  if (!name) return <span className="text-gray-300 text-xs">—</span>;
  const c = TEACHER_COLORS[name] || DEFAULT_COLOR;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label ?? name}
    </span>
  );
}

export function CourseDirectory() {
  const [search, setSearch] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("all");

  const allTeachers = useMemo(() => {
    const names = new Set<string>();
    for (const c of courses) {
      if (c.responsibleTeacher) names.add(c.responsibleTeacher);
      if (c.secondTeacher) names.add(c.secondTeacher);
      if (c.thirdTeacher) names.add(c.thirdTeacher);
    }
    return Array.from(names).sort();
  }, []);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch =
        search === "" ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.abbreviation.toLowerCase().includes(search.toLowerCase());

      const matchesTeacher =
        filterTeacher === "all" ||
        c.responsibleTeacher === filterTeacher ||
        c.secondTeacher === filterTeacher ||
        c.thirdTeacher === filterTeacher;

      return matchesSearch && matchesTeacher;
    });
  }, [search, filterTeacher]);

  // Group by Year
  const grouped = useMemo(() => {
    const map = new Map<number, typeof filtered>();
    for (const c of filtered) {
      if (!map.has(c.year)) map.set(c.year, []);
      map.get(c.year)!.push(c);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [filtered]);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Course Responsibles</h2>
        <p className="text-gray-500 mt-1">
          Responsible and substitute teachers for every course in the programme
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search course name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white w-64"
        />
        <select
          value={filterTeacher}
          onChange={(e) => setFilterTeacher(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="all">All teachers</option>
          {allTeachers.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {(search || filterTeacher !== "all") && (
          <button
            onClick={() => { setSearch(""); setFilterTeacher("all"); }}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
        <span className="text-xs text-gray-400 ml-auto">
          {filtered.length} course{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Teacher legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(TEACHER_COLORS).map(([name, colors]) => (
          <button
            key={name}
            onClick={() => setFilterTeacher(filterTeacher === name ? "all" : name)}
            className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-all ${
              filterTeacher === name
                ? `${colors.bg} ${colors.text} border-current`
                : `${colors.bg} ${colors.text} border-transparent opacity-70 hover:opacity-100`
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {name}
          </button>
        ))}
      </div>

      {/* Table grouped by year */}
      {grouped.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
          No courses match the current filters
        </div>
      ) : (
        grouped.map(([year, yearCourses]) => (
          <div key={year} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-gray-900">Year {year}</h3>
              <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {yearCourses.length} courses
              </span>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-left">
                    <th className="px-4 py-2.5 font-semibold text-gray-700">Course</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Code</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Sem</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">Responsible</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">2nd Teacher</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700">3rd Teacher</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700 text-center">Credits</th>
                    <th className="px-3 py-2.5 font-semibold text-gray-700 text-center">Weeks (FT)</th>
                  </tr>
                </thead>
                <tbody>
                  {yearCourses.map((c) => (
                    <tr key={c.abbreviation} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{c.name}</span>
                        <span className="text-xs text-gray-400 ml-1.5">({c.abbreviation})</span>
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">{c.code ?? "—"}</td>
                      <td className="px-3 py-3 text-xs text-gray-500">{c.semester ?? "—"}</td>
                      <td className="px-3 py-3">
                        <TeacherBadge name={c.responsibleTeacher} />
                      </td>
                      <td className="px-3 py-3">
                        <TeacherBadge name={c.secondTeacher} />
                      </td>
                      <td className="px-3 py-3">
                        <TeacherBadge name={c.thirdTeacher} />
                      </td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{c.credits ?? "—"}</td>
                      <td className="px-3 py-3 text-center text-gray-600 text-xs">{c.weeksFT}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
