import { useState, useMemo } from "react";
import { intakes, schedule, courses } from "../../store";
import { format, parseISO, addDays } from "date-fns";

function weekEnd(weekDate: string): string {
  return addDays(parseISO(weekDate), 6).toISOString().slice(0, 10);
}

// ── Teacher colour palette (consistent across the page) ───────────────────────
const TEACHER_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Shabana Jahan":  { bg: "bg-violet-100",  text: "text-violet-800",  dot: "bg-violet-500"  },
  "Martin Kruger":  { bg: "bg-pink-100",    text: "text-pink-800",    dot: "bg-pink-500"    },
  "Marvin Poole":   { bg: "bg-orange-100",  text: "text-orange-800",  dot: "bg-orange-500"  },
  "Lasse Hægland":  { bg: "bg-teal-100",    text: "text-teal-800",    dot: "bg-teal-500"    },
  "Adrian D Souza": { bg: "bg-blue-100",    text: "text-blue-800",    dot: "bg-blue-500"    },
  "Nelly Moseki":   { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-500" },
};
const DEFAULT_COLOR = { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" };

function teacherColor(name: string | null) {
  return (name && TEACHER_COLORS[name]) || DEFAULT_COLOR;
}

// ── Data helpers ──────────────────────────────────────────────────────────────

interface CourseBlock {
  courseAbbrev: string;
  courseName: string;
  teacher: string | null;
  startDate: string;
  endDate: string;
  totalWeeks: number;
  hasAssignment: boolean;
}

function buildCourseBlocks(intakeId: string): CourseBlock[] {
  const entries = schedule
    .filter((e) => e.intake === intakeId)
    .sort((a, b) => a.weekDate.localeCompare(b.weekDate));

  const blocks: CourseBlock[] = [];
  let cur: {
    abbrev: string; start: string; end: string;
    weeks: number; hasAssignment: boolean;
  } | null = null;

  for (const e of entries) {
    if (!cur || cur.abbrev !== e.courseAbbrev) {
      if (cur) {
        const c = courses.find((c) => c.abbreviation === cur!.abbrev);
        blocks.push({
          courseAbbrev: cur.abbrev,
          courseName: c?.name ?? cur.abbrev,
          teacher: c?.responsibleTeacher ?? null,
          startDate: cur.start,
          endDate: weekEnd(cur.end),
          totalWeeks: cur.weeks,
          hasAssignment: cur.hasAssignment,
        });
      }
      cur = { abbrev: e.courseAbbrev, start: e.weekDate, end: e.weekDate, weeks: 1, hasAssignment: e.isAssignmentWeek };
    } else {
      cur.end = e.weekDate;
      cur.weeks++;
      if (e.isAssignmentWeek) cur.hasAssignment = true;
    }
  }
  if (cur) {
    const c = courses.find((c) => c.abbreviation === cur!.abbrev);
    blocks.push({
      courseAbbrev: cur.abbrev,
      courseName: c?.name ?? cur.abbrev,
      teacher: c?.responsibleTeacher ?? null,
      startDate: cur.start,
      endDate: weekEnd(cur.end),
      totalWeeks: cur.weeks,
      hasAssignment: cur.hasAssignment,
    });
  }
  return blocks;
}

interface IntakeSnapshot {
  intakeId: string;
  type: "FT" | "PT";
  studentCount: number;
  studyPlan: string | null;
  status: "active" | "upcoming" | "completed";
  current: CourseBlock | null;
  currentWeek: number; // week number within current course
  weeksIntoProgram: number;
  totalProgramWeeks: number;
  pct: number;
  upcoming: CourseBlock[];
  programEnd: string | null;
}

function buildSnapshot(intakeId: string, today: string): IntakeSnapshot {
  const intake = intakes.find((i) => i.id === intakeId)!;
  const blocks = buildCourseBlocks(intakeId);
  const allEntries = schedule
    .filter((e) => e.intake === intakeId)
    .sort((a, b) => a.weekDate.localeCompare(b.weekDate));

  const totalProgramWeeks = allEntries.length;
  const weeksIntoProgram = allEntries.filter((e) => e.weekDate <= today).length;
  const pct = totalProgramWeeks > 0 ? Math.round((weeksIntoProgram / totalProgramWeeks) * 100) : 0;
  const programEnd = allEntries.length > 0 ? allEntries[allEntries.length - 1].weekDate : null;

  // Determine status
  const firstWeek = allEntries[0]?.weekDate;
  const lastWeek = programEnd;
  let status: "active" | "upcoming" | "completed" = "upcoming";
  if (lastWeek && lastWeek < today) status = "completed";
  else if (firstWeek && firstWeek <= today) status = "active";

  // Find current block
  const currentBlockIdx = blocks.findIndex(
    (b) => b.startDate <= today && b.endDate >= today
  );
  const current = currentBlockIdx >= 0 ? blocks[currentBlockIdx] : null;

  // Week number within current course
  let currentWeek = 0;
  if (current) {
    const weeksBefore = allEntries.filter(
      (e) => e.courseAbbrev === current.courseAbbrev && e.weekDate <= today && e.weekDate >= current.startDate
    ).length;
    currentWeek = weeksBefore;
  }

  // Next 4 upcoming blocks
  const upcomingStart = currentBlockIdx >= 0 ? currentBlockIdx + 1 : 0;
  const upcoming = blocks.slice(upcomingStart, upcomingStart + 4);

  return {
    intakeId,
    type: intake.type,
    studentCount: intake.studentCount,
    studyPlan: intake.studyPlan,
    status,
    current,
    currentWeek,
    weeksIntoProgram,
    totalProgramWeeks,
    pct,
    upcoming,
    programEnd,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IntakeTimeline() {
  const today = new Date().toISOString().slice(0, 10);
  const [filterType, setFilterType] = useState<"all" | "FT" | "PT">("all");
  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allTeachers = useMemo(
    () => [...new Set(courses.map((c) => c.responsibleTeacher).filter(Boolean))] as string[],
    []
  );

  const snapshots = useMemo(() => {
    return intakes
      .filter((i) => i.studentCount > 0)
      .map((i) => buildSnapshot(i.id, today))
      .sort((a, b) => {
        const statusOrder = { active: 0, upcoming: 1, completed: 2 };
        if (statusOrder[a.status] !== statusOrder[b.status])
          return statusOrder[a.status] - statusOrder[b.status];

        const monthOrder: Record<string, number> = { JAN: 1, MAR: 2, AUG: 3, OCT: 4 };
        const parse = (id: string) => {
          const intake = intakes.find((i) => i.id === id);
          return { year: intake?.startYear ?? 0, month: monthOrder[intake?.startMonth ?? ""] ?? 0 };
        };
        const pa = parse(a.intakeId);
        const pb = parse(b.intakeId);
        if (pa.year !== pb.year) return pa.year - pb.year;
        return pa.month - pb.month;
      });
  }, [today]);

  const filtered = useMemo(() => {
    return snapshots.filter((s) => {
      if (s.status === "completed") return false;
      if (filterType !== "all" && s.type !== filterType) return false;
      if (filterTeacher !== "all") {
        if (s.current?.teacher !== filterTeacher) return false;
      }
      return true;
    });
  }, [snapshots, filterType, filterTeacher]);

  const active = filtered.filter((s) => s.status === "active");
  const upcoming = filtered.filter((s) => s.status === "upcoming");

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Access List</h2>
        <p className="text-gray-500 mt-1">
          Current course, responsible teacher, and upcoming pipeline for every intake
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
          {(["all", "FT", "PT"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 transition-colors ${
                filterType === t ? "bg-indigo-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t === "all" ? "All types" : t === "FT" ? "Full-time" : "Part-time"}
            </button>
          ))}
        </div>

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

      </div>

      {/* Teacher legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(TEACHER_COLORS).map(([name, colors]) => (
          <span
            key={name}
            className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
            {name.split(" ")[0]} {name.split(" ").slice(-1)[0]}
          </span>
        ))}
      </div>

      {/* Active intakes */}
      {active.length > 0 && (
        <Section
          title="Active"
          badge={`${active.length}`}
          badgeColor="bg-green-100 text-green-700"
          snapshots={active}
          today={today}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
          allBlocks={buildCourseBlocks}
          filterTeacher={filterTeacher}
        />
      )}

      {/* Upcoming intakes */}
      {upcoming.length > 0 && (
        <Section
          title="Upcoming"
          badge={`${upcoming.length}`}
          badgeColor="bg-blue-100 text-blue-700"
          snapshots={upcoming}
          today={today}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
          allBlocks={buildCourseBlocks}
          filterTeacher={filterTeacher}
        />
      )}


      {filtered.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
          No intakes match the current filters
        </div>
      )}
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({
  title,
  badge,
  badgeColor,
  snapshots,
  today,
  expandedId,
  onToggle,
  allBlocks,
  filterTeacher = "all",
}: {
  title: string;
  badge: string;
  badgeColor: string;
  snapshots: IntakeSnapshot[];
  today: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
  allBlocks: (id: string) => CourseBlock[];
  filterTeacher?: string;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-left">
              <th className="px-4 py-2.5 font-semibold text-gray-700 w-6" />
              <th className="px-4 py-2.5 font-semibold text-gray-700">Intake</th>
              <th className="px-3 py-2.5 font-semibold text-gray-700">Students</th>
              <th className="px-3 py-2.5 font-semibold text-gray-700">Current Course</th>
              <th className="px-3 py-2.5 font-semibold text-gray-700">Responsible Teacher</th>
              <th className="px-3 py-2.5 font-semibold text-gray-700">Week</th>
              <th className="px-3 py-2.5 font-semibold text-gray-700">Course Progress</th>
              <th className="px-3 py-2.5 font-semibold text-gray-700">Upcoming Courses</th>
            </tr>
          </thead>
          <tbody>
            {snapshots.map((s) => {
              const isExpanded = expandedId === s.intakeId;
              const tc = teacherColor(s.current?.teacher ?? null);
              return (
                <>
                  <tr
                    key={s.intakeId}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      isExpanded ? "bg-indigo-50/40" : "hover:bg-gray-50"
                    }`}
                    onClick={() => onToggle(s.intakeId)}
                  >
                    {/* Expand toggle */}
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {isExpanded ? "▾" : "▸"}
                    </td>

                    {/* Intake ID */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{s.intakeId}</span>
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                          s.type === "FT" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {s.type}
                        </span>
                      </div>
                      {s.studyPlan && (
                        <span className="text-[10px] text-gray-400">{s.studyPlan}</span>
                      )}
                    </td>

                    {/* Students */}
                    <td className="px-3 py-3 text-gray-700 font-medium">{s.studentCount}</td>

                    {/* Current course */}
                    <td className="px-3 py-3">
                      {s.current ? (
                        <span className="font-medium text-gray-900">{s.current.courseName}</span>
                      ) : s.status === "upcoming" ? (
                        <span className="text-gray-400 text-xs">Not started</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Completed</span>
                      )}
                    </td>

                    {/* Teacher */}
                    <td className="px-3 py-3">
                      {s.current?.teacher ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full ${tc.bg} ${tc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tc.dot}`} />
                          {s.current.teacher}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>

                    {/* Week of course */}
                    <td className="px-3 py-3 text-gray-600 text-xs">
                      {s.current
                        ? `W${s.currentWeek} / ${s.current.totalWeeks}`
                        : "—"}
                    </td>

                    {/* Course progress */}
                    <td className="px-3 py-3">
                      {s.current ? (() => {
                        const coursePct = Math.round((s.currentWeek / s.current.totalWeeks) * 100);
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-indigo-500"
                                style={{ width: `${coursePct}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{coursePct}%</span>
                          </div>
                        );
                      })() : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Upcoming courses pills */}
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const visibleUpcoming = filterTeacher !== "all"
                            ? s.upcoming.filter((u) => u.teacher === filterTeacher)
                            : s.upcoming;
                          return visibleUpcoming.length > 0 ? visibleUpcoming.map((u, i) => {
                            const uc = teacherColor(u.teacher);
                            return (
                              <span
                                key={i}
                                className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${uc.bg} ${uc.text}`}
                                title={`${u.courseName} — ${u.teacher ?? "—"} · starts ${format(parseISO(u.startDate), "d MMM yyyy")}`}
                              >
                                {u.courseAbbrev}
                              </span>
                            );
                          }) : (
                            <span className="text-xs text-gray-400">—</span>
                          );
                        })()}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded: full remaining course list */}
                  {isExpanded && (
                    <tr key={`${s.intakeId}-expand`} className="bg-indigo-50/20 border-b border-gray-100">
                      <td colSpan={8} className="px-6 py-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Full course pipeline — {s.intakeId}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {allBlocks(s.intakeId).map((b, i) => {
                            const isPast = b.endDate < today;
                            const isCurrent = b.startDate <= today && b.endDate >= today;
                            const bc = teacherColor(b.teacher);
                            return (
                              <div
                                key={i}
                                className={`rounded-lg px-3 py-2 border text-xs ${
                                  isCurrent
                                    ? "border-indigo-300 bg-indigo-50"
                                    : isPast
                                      ? "border-gray-200 bg-gray-50 opacity-50"
                                      : "border-gray-200 bg-white"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-semibold text-gray-800">{b.courseName}</span>
                                  {isCurrent && (
                                    <span className="text-[9px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">NOW</span>
                                  )}
                                </div>
                                <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full mb-1 ${bc.bg} ${bc.text}`}>
                                  <span className={`w-1 h-1 rounded-full ${bc.dot}`} />
                                  {b.teacher ?? "—"}
                                </div>
                                <div className="text-gray-500 mt-0.5">
                                  {format(parseISO(b.startDate), "d MMM")} – {format(parseISO(b.endDate), "d MMM yyyy")}
                                  <span className="ml-1 text-gray-400">({b.totalWeeks}w)</span>
                                </div>
                                {b.hasAssignment && (
                                  <div className="text-[9px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                                    Submission week
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        {s.programEnd && (
                          <p className="text-xs text-gray-400 mt-3">
                            Programme ends: {format(parseISO(s.programEnd), "MMMM d, yyyy")}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
