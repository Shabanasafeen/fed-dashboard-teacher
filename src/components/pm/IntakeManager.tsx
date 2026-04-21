import { useState, useMemo } from "react";
import {
  intakes,
  schedule,
  isCustomIntake,
  persistNewIntake,
  persistStudentCount,
  deleteCustomIntake,
} from "../../store";
import {
  generateIntakeSchedule,
  buildIntakeId,
  getFirstMonday,
  monthNumber,
} from "../../utils/scheduleGenerator";
import type { Intake } from "../../types";
import { format, parseISO } from "date-fns";

const MONTHS = ["JAN", "MAR", "AUG", "OCT"] as const;
type Month = (typeof MONTHS)[number];

const STUDY_PLANS = ["S21", "S23", "S24", "S25"];

// ── Progression helpers ───────────────────────────────────────────────────────

function getIntakeProgress(intakeId: string, today: string) {
  const entries = schedule
    .filter((e) => e.intake === intakeId)
    .sort((a, b) => a.weekDate.localeCompare(b.weekDate));

  if (entries.length === 0) return null;

  const totalWeeks = entries.length;
  const doneIndex = entries.filter((e) => e.weekDate <= today).length;
  const pct = Math.min(100, Math.round((doneIndex / totalWeeks) * 100));

  const currentEntry = entries[doneIndex - 1] ?? entries[0];
  const nextEntry = entries[doneIndex] ?? null;

  return {
    totalWeeks,
    weeksComplete: doneIndex,
    weeksRemaining: totalWeeks - doneIndex,
    pct,
    currentCourse: currentEntry?.courseAbbrev ?? null,
    startDate: entries[0].weekDate,
    endDate: entries[totalWeeks - 1].weekDate,
    started: doneIndex > 0,
    nextCourse: nextEntry?.courseAbbrev ?? null,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function IntakeManager() {
  const today = new Date().toISOString().slice(0, 10);

  // Group intakes: active, upcoming, completed
  const { active, upcoming, completed } = useMemo(() => {
    const active: Intake[] = [];
    const upcoming: Intake[] = [];
    const completed: Intake[] = [];

    for (const intake of intakes) {
      const prog = getIntakeProgress(intake.id, today);
      if (!prog) { upcoming.push(intake); continue; }
      if (prog.pct >= 100) completed.push(intake);
      else if (prog.started) active.push(intake);
      else upcoming.push(intake);
    }

    // Sort active by pct descending, upcoming by start date, completed by end date
    active.sort((a, b) => {
      const pa = getIntakeProgress(a.id, today)!.pct;
      const pb = getIntakeProgress(b.id, today)!.pct;
      return pb - pa;
    });
    upcoming.sort((a, b) => {
      const sa = getIntakeProgress(a.id, today)?.startDate ?? "9999";
      const sb = getIntakeProgress(b.id, today)?.startDate ?? "9999";
      return sa.localeCompare(sb);
    });

    return { active, upcoming, completed };
  }, [today]);

  // ── Edit student count ────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);

  function startEdit(intake: Intake) {
    setEditingId(intake.id);
    setEditCount(intake.studentCount);
  }

  function saveEdit() {
    if (!editingId) return;
    persistStudentCount(editingId, editCount);
    window.location.reload();
  }

  // ── Add new intake form ────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [formMonth, setFormMonth] = useState<Month>("AUG");
  const [formYear, setFormYear] = useState(2026);
  const [formType, setFormType] = useState<"FT" | "PT">("FT");
  const [formStudents, setFormStudents] = useState(0);
  const [formStudyPlan, setFormStudyPlan] = useState("S25");
  const [formLms, setFormLms] = useState("New Moodle");
  const [formStartDate, setFormStartDate] = useState(() =>
    getFirstMonday(2026, monthNumber("AUG"))
  );
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Auto-update suggested start date when month/year changes
  function updateStartSuggestion(month: Month, year: number) {
    setFormStartDate(getFirstMonday(year, monthNumber(month)));
  }

  const previewId = buildIntakeId(formMonth, formYear, formType);
  const alreadyExists = intakes.some((i) => i.id === previewId);

  function handleAdd() {
    setAddError("");
    if (alreadyExists) { setAddError(`Intake ${previewId} already exists.`); return; }
    if (formStudents < 0) { setAddError("Student count cannot be negative."); return; }

    setAdding(true);
    try {
      const newIntake: Intake = {
        id: previewId,
        type: formType,
        startMonth: formMonth,
        startYear: formYear,
        studentCount: formStudents,
        studyPlan: formStudyPlan,
        lms: formLms,
      };

      // Use only the base schedule (scheduleData) as source for template so
      // we don't accidentally base off another custom intake.
      const generated = generateIntakeSchedule(
        previewId,
        formStartDate,
        formType,
        schedule
      );

      if (generated.length === 0) {
        setAddError("Could not generate schedule — no matching template found.");
        setAdding(false);
        return;
      }

      persistNewIntake(newIntake, generated);
      window.location.reload();
    } catch (e) {
      setAddError(String(e));
      setAdding(false);
    }
  }

  function handleDelete(intakeId: string) {
    if (!confirm(`Delete intake ${intakeId}? This cannot be undone.`)) return;
    deleteCustomIntake(intakeId);
    window.location.reload();
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Intake Manager</h2>
          <p className="text-gray-500 mt-1">
            Track active intakes, update student counts, and add upcoming cohorts
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add Intake"}
        </button>
      </div>

      {/* ── Add intake form ────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-xl border border-indigo-200 shadow-sm p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">New Intake</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <select
                value={formMonth}
                onChange={(e) => {
                  const m = e.target.value as Month;
                  setFormMonth(m);
                  updateStartSuggestion(m, formYear);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {MONTHS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
              <input
                type="number"
                value={formYear}
                onChange={(e) => {
                  const y = parseInt(e.target.value) || 2026;
                  setFormYear(y);
                  updateStartSuggestion(formMonth, y);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <div className="flex gap-2 mt-1">
                {(["FT", "PT"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFormType(t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      formType === t
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-300 hover:border-indigo-400"
                    }`}
                  >
                    {t === "FT" ? "Full-time" : "Part-time"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Student Count</label>
              <input
                type="number"
                min={0}
                value={formStudents}
                onChange={(e) => setFormStudents(parseInt(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Study Plan</label>
              <select
                value={formStudyPlan}
                onChange={(e) => setFormStudyPlan(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {STUDY_PLANS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">LMS</label>
              <select
                value={formLms}
                onChange={(e) => setFormLms(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option>New Moodle</option>
                <option>Moodle</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Start Date <span className="text-gray-400 font-normal">(first Monday of intake month)</span>
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm">
                <span className="text-gray-500">Intake ID: </span>
                <span className={`font-semibold ${alreadyExists ? "text-red-600" : "text-indigo-700"}`}>
                  {previewId}
                </span>
                {alreadyExists && <span className="text-red-500 text-xs ml-2">— already exists</span>}
              </p>
              {addError && <p className="text-red-600 text-xs mt-1">{addError}</p>}
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || alreadyExists}
              className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {adding ? "Adding..." : "Add Intake"}
            </button>
          </div>
        </div>
      )}

      {/* ── Active intakes ────────────────────────────────────────────────── */}
      <IntakeSection
        title="Active Intakes"
        intakes={active}
        today={today}
        editingId={editingId}
        editCount={editCount}
        onStartEdit={startEdit}
        onEditCount={setEditCount}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDelete={handleDelete}
        emptyMessage="No intakes currently in progress"
        badgeColor="bg-green-100 text-green-700"
      />

      {/* ── Upcoming intakes ──────────────────────────────────────────────── */}
      <IntakeSection
        title="Upcoming Intakes"
        intakes={upcoming}
        today={today}
        editingId={editingId}
        editCount={editCount}
        onStartEdit={startEdit}
        onEditCount={setEditCount}
        onSaveEdit={saveEdit}
        onCancelEdit={() => setEditingId(null)}
        onDelete={handleDelete}
        emptyMessage="No upcoming intakes scheduled"
        badgeColor="bg-blue-100 text-blue-700"
      />

      {/* ── Completed intakes ─────────────────────────────────────────────── */}
      <details className="mt-2">
        <summary className="cursor-pointer font-semibold text-gray-500 text-sm mb-3 select-none">
          Completed Intakes ({completed.length})
        </summary>
        <IntakeSection
          title=""
          intakes={completed}
          today={today}
          editingId={editingId}
          editCount={editCount}
          onStartEdit={startEdit}
          onEditCount={setEditCount}
          onSaveEdit={saveEdit}
          onCancelEdit={() => setEditingId(null)}
          onDelete={handleDelete}
          emptyMessage="No completed intakes"
          badgeColor="bg-gray-100 text-gray-500"
          compact
        />
      </details>
    </div>
  );
}

// ── IntakeSection sub-component ───────────────────────────────────────────────

function IntakeSection({
  title,
  intakes: list,
  today,
  editingId,
  editCount,
  onStartEdit,
  onEditCount,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  emptyMessage,
  badgeColor,
  compact = false,
}: {
  title: string;
  intakes: Intake[];
  today: string;
  editingId: string | null;
  editCount: number;
  onStartEdit: (i: Intake) => void;
  onEditCount: (n: number) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  emptyMessage: string;
  badgeColor: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "" : "mb-8"}>
      {title && (
        <h3 className="font-semibold text-gray-900 mb-3">
          {title}
          <span className="ml-2 text-sm font-normal text-gray-400">({list.length})</span>
        </h3>
      )}
      {list.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-5 text-center text-gray-500 text-sm">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((intake) => {
            const prog = getIntakeProgress(intake.id, today);
            const custom = isCustomIntake(intake.id);
            const isEditing = editingId === intake.id;

            return (
              <div
                key={intake.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-semibold text-gray-900">{intake.id}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${badgeColor}`}>
                      {intake.type === "FT" ? "Full-time" : "Part-time"}
                    </span>
                    {intake.studyPlan && (
                      <span className="text-xs text-gray-400">{intake.studyPlan}</span>
                    )}
                    {custom && (
                      <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded">
                        custom
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isEditing ? (
                      <>
                        <input
                          type="number"
                          min={0}
                          value={editCount}
                          onChange={(e) => onEditCount(parseInt(e.target.value) || 0)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-20"
                          autoFocus
                        />
                        <button
                          onClick={onSaveEdit}
                          className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="text-xs text-gray-500 hover:text-gray-700 px-2"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium text-gray-700">
                          {intake.studentCount} students
                        </span>
                        <button
                          onClick={() => onStartEdit(intake)}
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                        {custom && (
                          <button
                            onClick={() => onDelete(intake.id)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {prog && !compact && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>
                        {prog.started
                          ? prog.pct < 100
                            ? `Week ${prog.weeksComplete} of ${prog.totalWeeks} — ${prog.currentCourse}`
                            : "Completed"
                          : `Starts ${format(parseISO(prog.startDate), "MMM d, yyyy")}`}
                      </span>
                      <span>{prog.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          prog.pct >= 100
                            ? "bg-gray-400"
                            : prog.pct > 60
                              ? "bg-indigo-500"
                              : "bg-emerald-500"
                        }`}
                        style={{ width: `${prog.pct}%` }}
                      />
                    </div>
                    {prog.pct < 100 && prog.started && (
                      <p className="text-xs text-gray-400 mt-1">
                        {prog.weeksRemaining} week{prog.weeksRemaining !== 1 ? "s" : ""} remaining
                        {prog.endDate && ` · Ends ${format(parseISO(prog.endDate), "MMM d, yyyy")}`}
                      </p>
                    )}
                  </div>
                )}

                {prog && compact && (
                  <p className="text-xs text-gray-400 mt-1">
                    {prog.startDate} – {prog.endDate}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
