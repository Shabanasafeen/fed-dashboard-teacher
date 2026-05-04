import { useState, useMemo } from "react";
import { teachers } from "../../store";

interface Props {
  selectedTeacher: string;
  onTeacherChange: (name: string) => void;
}
import { getUpcomingAssignments } from "../../utils/schedule";
import { format, parseISO, differenceInDays } from "date-fns";

export function GradingDeadlines({ selectedTeacher, onTeacherChange }: Props) {
  const [showUpcoming, setShowUpcoming] = useState(false);

  const today = new Date().toISOString().slice(0, 10);

  const allAssignments = useMemo(
    () => getUpcomingAssignments(selectedTeacher, today),
    [selectedTeacher, today]
  );

  // Split into delivered (grading in progress) and not yet delivered
  const delivered = allAssignments.filter((a) => a.deliveryDate <= today);
  const upcoming = allAssignments.filter((a) => a.deliveryDate > today);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Grading Deadlines
        </h2>
        <p className="text-gray-500 mt-1">
          Assignments are delivered Sunday of the last course week. Grades must be released by Friday of the 3rd week.
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
          {teachers.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Active grading — already delivered */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-gray-900">Active Grading</h3>
          <span className="text-xs font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
            {delivered.length} assignment{delivered.length !== 1 ? "s" : ""} to mark
          </span>
        </div>
        {delivered.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500 text-sm">
            No assignments currently awaiting grading
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-semibold text-gray-700">Course</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Intake</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Delivered</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Grading Deadline</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Days Left</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Students</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {delivered.map((a, i) => {
                  const daysLeft = differenceInDays(parseISO(a.gradingDeadline), parseISO(today));
                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className="font-medium text-gray-900">{a.courseName}</span>
                        <span className="text-xs text-gray-400 ml-1">({a.courseAbbrev})</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.intake}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(parseISO(a.deliveryDate), "EEE, MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(parseISO(a.gradingDeadline), "EEE, MMM d, yyyy")}
                      </td>
                      <td className="text-center px-4 py-3">
                        <span
                          className={`font-medium ${
                            daysLeft <= 7 ? "text-red-600" : "text-gray-600"
                          }`}
                        >
                          {daysLeft}d
                        </span>
                      </td>
                      <td className="text-center px-4 py-3 font-medium text-gray-700">
                        {a.studentCount}
                      </td>
                      <td className="text-center px-4 py-3">
                        {daysLeft <= 7 ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Urgent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            In Progress
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-5 py-3 bg-gray-50 text-xs text-gray-500 border-t border-gray-200">
              {delivered.length} assignment{delivered.length !== 1 ? "s" : ""} |{" "}
              {delivered.reduce((s, a) => s + a.studentCount, 0)} students to grade
            </div>
          </div>
        )}
      </div>

      {/* Upcoming deliveries — not yet delivered */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={() => setShowUpcoming((v) => !v)}
            className="flex items-center gap-2 group"
          >
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              Upcoming Deliveries
            </h3>
            <span className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {upcoming.length} upcoming
            </span>
            <span className="text-xs text-gray-400 group-hover:text-indigo-500 transition-colors">
              {showUpcoming ? "▲ hide" : "▼ show"}
            </span>
          </button>
        </div>
        {showUpcoming && upcoming.length === 0 ? (
          <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-500 text-sm">
            No upcoming assignment deliveries scheduled
          </div>
        ) : showUpcoming ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-5 py-3 font-semibold text-gray-700">Course</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Intake</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Delivery Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">Grading Deadline</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Days Until Delivery</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">Students</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((a, i) => {
                  const daysUntilDelivery = differenceInDays(parseISO(a.deliveryDate), parseISO(today));
                  return (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <span className="font-medium text-gray-900">{a.courseName}</span>
                        <span className="text-xs text-gray-400 ml-1">({a.courseAbbrev})</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.intake}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(parseISO(a.deliveryDate), "EEE, MMM d, yyyy")}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {format(parseISO(a.gradingDeadline), "EEE, MMM d, yyyy")}
                      </td>
                      <td className="text-center px-4 py-3">
                        <span className="font-medium text-gray-600">{daysUntilDelivery}d</span>
                      </td>
                      <td className="text-center px-4 py-3 font-medium text-gray-700">
                        {a.studentCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
