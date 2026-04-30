import type { Role } from "../../types";

type PmPage = "overview" | "timeline" | "workload" | "scenario" | "intakes" | "aug2026";
type TeacherPage = "dashboard" | "grading" | "courses" | "accesslist";

interface SidebarProps {
  role: Role;
  onRoleChange: (role: Role) => void;
  pmPage: PmPage;
  onPmPageChange: (page: PmPage) => void;
  teacherPage: TeacherPage;
  onTeacherPageChange: (page: TeacherPage) => void;
  teacherOnly?: boolean;
}

export function Sidebar({
  role,
  onRoleChange,
  pmPage,
  onPmPageChange,
  teacherPage,
  onTeacherPageChange,
  teacherOnly = false,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-900 text-white flex flex-col min-h-screen shrink-0">
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-lg font-bold tracking-tight">FED Dashboard</h1>
        <p className="text-xs text-slate-400 mt-1">
          Front End Development Program
        </p>
      </div>

      {!teacherOnly && (
        <div className="p-3 border-b border-slate-700">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">
            Role
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => onRoleChange("pm")}
              className={`flex-1 text-sm py-2 px-3 rounded-md transition-colors ${
                role === "pm"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              Program Manager
            </button>
            <button
              onClick={() => onRoleChange("teacher")}
              className={`flex-1 text-sm py-2 px-3 rounded-md transition-colors ${
                role === "teacher"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              Teacher
            </button>
          </div>
        </div>
      )}

      <nav className="flex-1 p-3">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2 px-2">
          Navigation
        </p>
        {role === "pm" && !teacherOnly ? (
          <ul className="space-y-1">
            <NavItem
              label="Overview"
              icon="📊"
              active={pmPage === "overview"}
              onClick={() => onPmPageChange("overview")}
            />
            <NavItem
              label="Access List"
              icon="📅"
              active={pmPage === "timeline"}
              onClick={() => onPmPageChange("timeline")}
            />
            <NavItem
              label="Teacher Workload"
              icon="⚖️"
              active={pmPage === "workload"}
              onClick={() => onPmPageChange("workload")}
            />
            <NavItem
              label="Course Responsibles"
              icon="🔄"
              active={pmPage === "scenario"}
              onClick={() => onPmPageChange("scenario")}
            />
            <NavItem
              label="Intake Manager"
              icon="🎓"
              active={pmPage === "intakes"}
              onClick={() => onPmPageChange("intakes")}
            />
            <NavItem
              label="Aug 2026 Scenario"
              icon="📋"
              active={pmPage === "aug2026"}
              onClick={() => onPmPageChange("aug2026")}
            />
          </ul>
        ) : (
          <ul className="space-y-1">
            <NavItem
              label="My Dashboard"
              icon="🏠"
              active={teacherPage === "dashboard"}
              onClick={() => onTeacherPageChange("dashboard")}
            />
            <NavItem
              label="Grading Deadlines"
              icon="📝"
              active={teacherPage === "grading"}
              onClick={() => onTeacherPageChange("grading")}
            />
            <NavItem
              label="Course Responsibles"
              icon="📚"
              active={teacherPage === "courses"}
              onClick={() => onTeacherPageChange("courses")}
            />
            <NavItem
              label="Access List"
              icon="📅"
              active={teacherPage === "accesslist"}
              onClick={() => onTeacherPageChange("accesslist")}
            />
          </ul>
        )}
      </nav>

      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        FED Program Management v1.0
      </div>
    </aside>
  );
}

function NavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
          active
            ? "bg-indigo-600/20 text-indigo-300 font-medium"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`}
      >
        <span>{icon}</span>
        {label}
      </button>
    </li>
  );
}
