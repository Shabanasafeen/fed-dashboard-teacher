import { useState, useMemo } from "react";
import { intakes, schedule, courses } from "../../store";
import { format, parseISO, addDays } from "date-fns";

const SIM_DATE = "2026-08-10";

// ── Aug 2026 course responsible mapping ───────────────────────────────────────
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

// ── Teacher colour palette ────────────────────────────────────────────────────
const TEACHER_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  "Shabana Jahan":  { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-500" },
  "Lasse Hægland":  { bg: "bg-teal-100",   text: "text-teal-800",   dot: "bg-teal-500"   },
  "Monde":          { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-500" },
  "Adrian D Souza": { bg: "bg-blue-100",   text: "text-blue-800",   dot: "bg-blue-500"   },
};
const DEFAULT_COLOR = { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-400" };

function teacherColor(name: string | null) {
  return (name && TEACHER_COLORS[name]) || DEFAULT_COLOR;
}

function weekEnd(weekDate: string): string {
  return addDays(parseISO(weekDate), 6).toISOString().slice(0, 10);
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
  let cur: { abbrev: string; start: string; end: string; weeks: number; hasAssignment: boolean } | null = null;

  for (const e of entries) {
    if (!cur || cur.abbrev !== e.courseAbbrev) {
      if (cur) {
        const course = courses.find((c) => c.abbreviation === cur!.abbrev);
        blocks.push({
          courseAbbrev: cur.abbrev,
          courseName: course?.name ?? cur.abbrev,
          teacher: AUG2026_RESPONSIBLE[cur.abbrev] ?? course?.responsibleTeacher ?? null,
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
    const course = courses.find((c) => c.abbreviation === cur!.abbrev);
    blocks.push({
      courseAbbrev: cur.abbrev,
      courseName: course?.name ?? cur.abbrev,
      teacher: AUG2026_RESPONSIBLE[cur.abbrev] ?? course?.responsibleTeacher ?? null,
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
  currentWeek: number;
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

  const firstWeek = allEntries[0]?.weekDate;
  const lastWeek = programEnd;
  let status: "active" | "upcoming" | "completed" = "upcoming";
  if (lastWeek && lastWeek < today) status = "completed";
  else if (firstWeek && firstWeek <= today) status = "active";

  const currentBlockIdx = blocks.findIndex(
    (b) => b.startDate <= today && b.endDate >= today
  );
  const current = currentBlockIdx >= 0 ? blocks[currentBlockIdx] : null;

  let currentWeek = 0;
  if (current) {
    currentWeek = allEntries.filter(
      (e) => e.courseAbbrev === current.courseAbbrev && e.weekDate <= today && e.weekDate >= current.startDate
    ).length;
  }

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

export function AccessListAug2026() {
  const [useSimDate, setUseSimDate] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "FT" | "PT">("all");
  const [filterTeacher, setFilterTeacher] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = useSimDate ? SIM_DATE : new Date().toISOString().slice(0, 10);

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
      if (filterTeacher !== "all" && s.current?.teacher !== filterTeacher) return false;
      return true;
    });
  }, [snapshots, filterType, filterTeacher]);

  const active = filtered.filter((s) => s.status === "active");
  const upcoming = filtered.filter((s) => s.status === "upcoming");

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-2xl font-bold text-gray-900">Access List — August 2026</h2>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">
              Planning scenario
            </span>
          </div>
          <p className="text-gray-500 mt-1">
            Course access and responsible teacher assignments as of August 2026 team restructure
          </p>
        </div>
        <button
          onClick={() => setUseSimDate(!useSimDate)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors shrink-0 ${
            useSimDate
              ? "bg-amber-50 border-amber-300 text-amber-700"
              : "bg-gray-50 border-gray-300 text-gray-600"
          }`}
        >
          {useSimDate ? "Viewing: Aug 2026 simulation" : `Viewing: Today (${today})`}
        </button>
      </div>

      {/* Context banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 text-sm text-blue-700">
        <p className="font-semibold text-blue-800 mb-1">August 2026 team</p>
        <p>
          This view applies the new course responsibilities for{" "}
          <strong>Lasse Hægland</strong>, <strong>Monde</strong>, and{" "}
          <strong>Adrian D Souza</strong>. Teachers who have left the team are no longer shown as
          responsible. Programme introductions remain with <strong>Shabana Jahan</strong>.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
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
          {Object.keys(TEACHER_COLORS).map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {filterTeacher !== "all" && (
          <button
            onClick={() => setFilterTeacher("all")}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear
          </button>
        )}
      </div>

      {/* Teacher legend */}
      <div className="flex flex-wrap gap-2 mb-5">
        {Object.entries(TEACHER_COLORS).map(([name, colors]) => (
          <button
            key={name}
            onClick={() => setFilterTeacher(filterTeacher === name ? "all" : name)}
            className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
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

      {active.length > 0 && (
        <IntakeSection
          title="Active"
          badge={`${active.length}`}
          badgeColor="bg-green-100 text-green-700"
          snapshots={active}
          today={today}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
          filterTeacher={filterTeacher}
        />
      )}

      {upcoming.length > 0 && (
        <IntakeSection
          title="Upcoming"
          badge={`${upcoming.length}`}
          badgeColor="bg-blue-100 text-blue-700"
          snapshots={upcoming}
          today={today}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
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

function IntakeSection({
  title,
  badge,
  badgeColor,
  snapshots,
  today,
  expandedId,
  onToggle,
  filterTeacher,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  snapshots: IntakeSnapshot[];
  today: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
  filterTeacher: string;
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
              <th className="px-3 py-2.5 font-semibold text-gray-700">Responsible (Aug 2026)</th>
              <th className="px-3 py-2.5 font-semibold text-gray-700">Week</th>
              <th className="px-3 py-2.5 font-semibold text-gray-700">Course Progress</th>
              <th className="px-3 py-2.5 font-semibold text-gray-700">Upcoming</th>
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
                    <td className="px-4 py-3 text-gray-400 text-xs">{isExpanded ? "▾" : "▸"}</td>

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

                    <td className="px-3 py-3 text-gray-700 font-medium">{s.studentCount}</td>

                    <td className="px-3 py-3">
                      {s.current ? (
                        <span className="font-medium text-gray-900">{s.current.courseName}</span>
                      ) : s.status === "upcoming" ? (
                        <span className="text-gray-400 text-xs">Not started</span>
                      ) : (
                        <span className="text-gray-400 text-xs">Completed</span>
                      )}
                    </td>

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

                    <td className="px-3 py-3 text-gray-600 text-xs">
                      {s.current ? `W${s.currentWeek} / ${s.current.totalWeeks}` : "—"}
                    </td>

                    <td className="px-3 py-3">
                      {s.current ? (() => {
                        const coursePct = Math.round((s.currentWeek / s.current.totalWeeks) * 100);
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${coursePct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500">{coursePct}%</span>
                          </div>
                        );
                      })() : <span className="text-xs text-gray-400">—</span>}
                    </td>

                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const visible = filterTeacher !== "all"
                            ? s.upcoming.filter((u) => u.teacher === filterTeacher)
                            : s.upcoming;
                          return visible.length > 0 ? visible.map((u, i) => {
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
                          }) : <span className="text-xs text-gray-400">—</span>;
                        })()}
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr key={`${s.intakeId}-expand`} className="bg-indigo-50/20 border-b border-gray-100">
                      <td colSpan={8} className="px-6 py-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                          Full course pipeline — {s.intakeId}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {buildCourseBlocks(s.intakeId).map((b, i) => {
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
