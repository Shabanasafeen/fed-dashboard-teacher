import { useMemo, useState } from "react";
import { intakes, intakeLastDate } from "../../store";
import { format, parseISO, getQuarter, getYear } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const SIM_DATE = "2026-08-10";

function quarterLabel(date: string) {
  const d = parseISO(date);
  return `Q${getQuarter(d)} ${getYear(d)}`;
}

export function CohortForecast() {
  const [useSimDate, setUseSimDate] = useState(true);
  const [sortBy, setSortBy] = useState<"date" | "students">("date");

  const refDate = useSimDate ? SIM_DATE : new Date().toISOString().slice(0, 10);

  // All intakes that finish after the reference date (still upcoming graduations)
  const forecastIntakes = useMemo(() => {
    return intakes
      .filter((i) => {
        if (i.studentCount === 0) return false;
        const last = intakeLastDate.get(i.id);
        return last != null && last >= refDate;
      })
      .map((i) => ({
        ...i,
        endDate: intakeLastDate.get(i.id)!,
        quarter: quarterLabel(intakeLastDate.get(i.id)!),
      }))
      .sort((a, b) =>
        sortBy === "date"
          ? a.endDate.localeCompare(b.endDate)
          : b.studentCount - a.studentCount
      );
  }, [refDate, sortBy]);

  // Group by quarter for chart
  const quarterGroups = useMemo(() => {
    const map = new Map<string, { students: number; intakeCount: number; endDate: string }>();
    for (const i of forecastIntakes) {
      const prev = map.get(i.quarter);
      if (prev) {
        prev.students += i.studentCount;
        prev.intakeCount++;
      } else {
        map.set(i.quarter, {
          students: i.studentCount,
          intakeCount: 1,
          endDate: i.endDate,
        });
      }
    }
    return Array.from(map.entries())
      .map(([label, data]) => ({ label, ...data }))
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
  }, [forecastIntakes]);

  const totalCompletingStudents = forecastIntakes.reduce((s, i) => s + i.studentCount, 0);
  const next12Months = useMemo(() => {
    const cutoff = new Date(refDate);
    cutoff.setFullYear(cutoff.getFullYear() + 1);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return forecastIntakes
      .filter((i) => i.endDate <= cutoffStr)
      .reduce((s, i) => s + i.studentCount, 0);
  }, [forecastIntakes, refDate]);

  const QUARTER_COLORS = [
    "#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd",
    "#818cf8", "#7c3aed", "#4f46e5", "#3730a3",
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Graduation Forecast</h2>
          <p className="text-gray-500 mt-1">When cohorts complete the program</p>
        </div>
        <button
          onClick={() => setUseSimDate(!useSimDate)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            useSimDate
              ? "bg-amber-50 border-amber-300 text-amber-700"
              : "bg-gray-50 border-gray-300 text-gray-600"
          }`}
        >
          {useSimDate ? "Aug 2026 simulation" : `Today (${refDate})`}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Cohorts still running</p>
          <p className="text-2xl font-bold text-gray-900">{forecastIntakes.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Students completing next 12 months</p>
          <p className="text-2xl font-bold text-indigo-700">{next12Months}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total students in pipeline</p>
          <p className="text-2xl font-bold text-gray-900">{totalCompletingStudents}</p>
        </div>
      </div>

      {/* Bar chart by quarter */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h3 className="font-semibold text-gray-900 mb-4">Students graduating per quarter</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={quarterGroups} barSize={40}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#6b7280" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value, _name, props) => [
                `${value} students (${props.payload.intakeCount} cohort${props.payload.intakeCount !== 1 ? "s" : ""})`,
                "Completing",
              ]}
            />
            <Bar dataKey="students" radius={[4, 4, 0, 0]}>
              {quarterGroups.map((_, i) => (
                <Cell key={i} fill={QUARTER_COLORS[i % QUARTER_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Cohort completion dates</h3>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "students")}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="date">Sort: End date</option>
            <option value="students">Sort: Most students</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Cohort</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Type</th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-700">Students</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Study Plan</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Final Week</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Quarter</th>
            </tr>
          </thead>
          <tbody>
            {forecastIntakes.map((i) => (
              <tr key={i.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{i.id}</td>
                <td className="px-3 py-2.5">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded ${
                      i.type === "FT"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {i.type}
                  </span>
                </td>
                <td className="text-center px-3 py-2.5 font-semibold text-gray-800">
                  {i.studentCount}
                </td>
                <td className="px-3 py-2.5 text-gray-500">{i.studyPlan ?? "—"}</td>
                <td className="px-3 py-2.5 text-gray-700">
                  {format(parseISO(i.endDate), "d MMM yyyy")}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {i.quarter}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {forecastIntakes.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">
            No cohorts scheduled to complete after this date.
          </p>
        )}
      </div>
    </div>
  );
}
