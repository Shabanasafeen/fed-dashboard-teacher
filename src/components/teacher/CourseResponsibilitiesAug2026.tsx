const TEACHER_COLORS: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  "Lasse Hægland":  { bg: "bg-teal-100",   text: "text-teal-800",   dot: "bg-teal-500",   border: "border-teal-300"  },
  "Monde":          { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500", border: "border-indigo-300" },
  "Adrian D Souza": { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500",   border: "border-blue-300"  },
  "Shabana Jahan":  { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-500", border: "border-violet-300" },
};
const DEFAULT_COLOR = { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400", border: "border-gray-300" };

function TeacherBadge({ name }: { name: string | null }) {
  if (!name) return <span className="text-gray-300 text-xs">—</span>;
  const c = TEACHER_COLORS[name] || DEFAULT_COLOR;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${c.dot}`} />
      {name}
    </span>
  );
}

interface AugCourse {
  name: string;
  abbreviation: string;
  code: string | null;
  year: number;
  semester: number;
  credits: number | null;
  weeksFT: number;
  responsible: string;
  second: string;
  third: string;
}

const AUG2026_COURSES: AugCourse[] = [
  // ── Year 1 · Semester 1 ───────────────────────────────────────────────────
  { name: "Introduction",         abbreviation: "INTRO", code: null,          year: 1, semester: 1, credits: null, weeksFT: 1, responsible: "Shabana Jahan",  second: "Lasse Hægland",  third: "Monde"          },
  { name: "Design",               abbreviation: "DES",   code: "FM1AIDE10",   year: 1, semester: 1, credits: 10,  weeksFT: 5, responsible: "Monde",           second: "Lasse Hægland",  third: "Adrian D Souza" },
  { name: "HTML and CSS",         abbreviation: "HTML",  code: "FM1AIHC10",   year: 1, semester: 1, credits: 10,  weeksFT: 6, responsible: "Adrian D Souza",  second: "Monde",          third: "Lasse Hægland"  },
  { name: "Project Methodology",  abbreviation: "PME",   code: "FM1AIPM25",   year: 1, semester: 1, credits: 2.5, weeksFT: 2, responsible: "Lasse Hægland",  second: "Monde",          third: "Adrian D Souza" },
  { name: "Semester Project 1",   abbreviation: "SP1",   code: "FM1AIS175",   year: 1, semester: 1, credits: 7.5, weeksFT: 4, responsible: "Lasse Hægland",  second: "Adrian D Souza", third: "Monde"          },
  // ── Year 1 · Semester 2 ───────────────────────────────────────────────────
  { name: "JavaScript 1",         abbreviation: "JS1",   code: "FM1AIJ110",   year: 1, semester: 2, credits: 10,  weeksFT: 8, responsible: "Lasse Hægland",  second: "Monde",          third: "Adrian D Souza" },
  { name: "Agency 1",             abbreviation: "AGC1",  code: "FM1AIA110",   year: 1, semester: 2, credits: 10,  weeksFT: 6, responsible: "Adrian D Souza",  second: "Lasse Hægland",  third: "Monde"          },
  { name: "Exam Project 1",       abbreviation: "PE1",   code: "FM1AIP175",   year: 1, semester: 2, credits: 7.5, weeksFT: 6, responsible: "Monde",           second: "Adrian D Souza", third: "Lasse Hægland"  },
  { name: "Portfolio 1",          abbreviation: "POR1",  code: "FM1AIPO25",   year: 1, semester: 2, credits: 2.5, weeksFT: 2, responsible: "Lasse Hægland",  second: "Monde",          third: "Adrian D Souza" },
  // ── Year 2 · Semester 3 ───────────────────────────────────────────────────
  { name: "Introduction",         abbreviation: "INTRO", code: null,          year: 2, semester: 3, credits: null, weeksFT: 1, responsible: "Shabana Jahan",  second: "Monde",          third: "Adrian D Souza" },
  { name: "JavaScript 2",         abbreviation: "JS2",   code: "FM2AJJ210",   year: 2, semester: 3, credits: 10,  weeksFT: 6, responsible: "Lasse Hægland",  second: "Adrian D Souza", third: "Monde"          },
  { name: "Workflow",             abbreviation: "WFL",   code: "FM2AJWF05",   year: 2, semester: 3, credits: 5,   weeksFT: 3, responsible: "Monde",           second: "Lasse Hægland",  third: "Adrian D Souza" },
  { name: "CSS Frameworks",       abbreviation: "CSS",   code: "FM2AJCF05",   year: 2, semester: 3, credits: 5,   weeksFT: 3, responsible: "Monde",           second: "Adrian D Souza", third: "Lasse Hægland"  },
  { name: "Semester Project 2",   abbreviation: "SP2",   code: "FM2AJS210",   year: 2, semester: 3, credits: 10,  weeksFT: 5, responsible: "Adrian D Souza",  second: "Monde",          third: "Lasse Hægland"  },
  // ── Year 2 · Semester 4 ───────────────────────────────────────────────────
  { name: "Development Platforms",abbreviation: "DVP",   code: "FM2AJDP05",   year: 2, semester: 4, credits: 5,   weeksFT: 4, responsible: "Monde",           second: "Lasse Hægland",  third: "Adrian D Souza" },
  { name: "JavaScript Frameworks",abbreviation: "JSF",   code: "FM2AJJF75",   year: 2, semester: 4, credits: 7.5, weeksFT: 6, responsible: "Adrian D Souza",  second: "Lasse Hægland",  third: "Monde"          },
  { name: "Agency 2",             abbreviation: "AGC2",  code: "FM2AJA205",   year: 2, semester: 4, credits: 5,   weeksFT: 4, responsible: "Monde",           second: "Adrian D Souza", third: "Lasse Hægland"  },
  { name: "Exam Project 2",       abbreviation: "PE2",   code: "FM2AJP210",   year: 2, semester: 4, credits: 10,  weeksFT: 6, responsible: "Adrian D Souza",  second: "Monde",          third: "Lasse Hægland"  },
  { name: "Portfolio 2",          abbreviation: "POR2",  code: "FM2AJPO25",   year: 2, semester: 4, credits: 2.5, weeksFT: 2, responsible: "Lasse Hægland",  second: "Adrian D Souza", third: "Monde"          },
];

const CORE_TEACHERS = ["Lasse Hægland", "Monde", "Adrian D Souza"] as const;

export function CourseResponsibilitiesAug2026() {
  const byYear: Record<number, AugCourse[]> = {};
  for (const c of AUG2026_COURSES) {
    if (!byYear[c.year]) byYear[c.year] = [];
    byYear[c.year].push(c);
  }

  // Tally primary responsibilities per teacher
  const primaryCount: Record<string, number> = {};
  const secondCount: Record<string, number> = {};
  const thirdCount: Record<string, number> = {};
  for (const c of AUG2026_COURSES) {
    if (c.abbreviation === "INTRO") continue; // exclude INTRO from tally
    primaryCount[c.responsible] = (primaryCount[c.responsible] ?? 0) + 1;
    secondCount[c.second] = (secondCount[c.second] ?? 0) + 1;
    thirdCount[c.third] = (thirdCount[c.third] ?? 0) + 1;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h2 className="text-2xl font-bold text-gray-900">Course Responsibilities — August 2026</h2>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
            Planning scenario
          </span>
        </div>
        <p className="text-gray-500 mt-1">
          Proposed course distribution following staff changes effective August 2026
        </p>
      </div>

      {/* Distribution summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {CORE_TEACHERS.map((name) => {
          const c = TEACHER_COLORS[name] || DEFAULT_COLOR;
          const primary = primaryCount[name] ?? 0;
          const second = secondCount[name] ?? 0;
          const third = thirdCount[name] ?? 0;
          return (
            <div key={name} className={`bg-white border ${c.border} rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                <span className={`text-sm font-bold ${c.text}`}>{name}</span>
              </div>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Primary</span>
                  <span className="font-bold text-gray-900">{primary} courses</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">2nd teacher</span>
                  <span className="font-medium text-gray-700">{second} courses</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">3rd teacher</span>
                  <span className="font-medium text-gray-700">{third} courses</span>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-gray-100">
                  <span className="text-xs text-gray-400">Total involvement</span>
                  <span className="text-xs font-semibold text-gray-600">{primary + second + third}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tables by Year */}
      {[1, 2].map((year) => (
        <div key={year} className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="font-semibold text-gray-900">Year {year}</h3>
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {byYear[year]?.length ?? 0} courses
            </span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-left">
                  <th className="px-4 py-2.5 font-semibold text-gray-700">Course</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-700 text-center">Sem</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-700 text-center">Credits</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-700">Responsible</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-700">2nd Teacher</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-700">3rd Teacher</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-700 text-center">Wks (FT)</th>
                </tr>
              </thead>
              <tbody>
                {(byYear[year] ?? []).map((c, i) => (
                  <tr
                    key={`${c.abbreviation}-${i}`}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="text-xs text-gray-400 ml-1.5">({c.abbreviation})</span>
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-gray-500">{c.semester}</td>
                    <td className="px-3 py-3 text-center text-xs text-gray-500">{c.credits ?? "—"}</td>
                    <td className="px-3 py-3"><TeacherBadge name={c.responsible} /></td>
                    <td className="px-3 py-3"><TeacherBadge name={c.second} /></td>
                    <td className="px-3 py-3"><TeacherBadge name={c.third} /></td>
                    <td className="px-3 py-3 text-center text-xs text-gray-500">{c.weeksFT}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mt-2">
        {Object.entries(TEACHER_COLORS).map(([name, c]) => (
          <span key={name} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
