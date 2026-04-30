import { useState } from "react";
import type { Role } from "./types";
import { Sidebar } from "./components/layout/Sidebar";
import { PmOverview } from "./components/pm/PmOverview";
import { IntakeTimeline } from "./components/pm/IntakeTimeline";
import { WorkloadChart } from "./components/pm/WorkloadChart";
import { ScenarioSim } from "./components/pm/ScenarioSim";
import { Aug2026Sim } from "./components/pm/Aug2026Sim";
import { IntakeManager } from "./components/pm/IntakeManager";
import { TeacherDashboard } from "./components/teacher/TeacherDashboard";
import { GradingDeadlines } from "./components/teacher/GradingDeadlines";
import { CourseDirectory } from "./components/teacher/CourseDirectory";

type PmPage = "overview" | "timeline" | "workload" | "scenario" | "intakes" | "aug2026";
type TeacherPage = "dashboard" | "grading" | "courses" | "accesslist";

const TEACHER_ONLY = import.meta.env.VITE_ROLE === "teacher";

function App() {
  const [role, setRole] = useState<Role>(TEACHER_ONLY ? "teacher" : "pm");
  const [pmPage, setPmPage] = useState<PmPage>("overview");
  const [teacherPage, setTeacherPage] = useState<TeacherPage>("dashboard");

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        role={role}
        onRoleChange={setRole}
        pmPage={pmPage}
        onPmPageChange={setPmPage}
        teacherPage={teacherPage}
        onTeacherPageChange={setTeacherPage}
        teacherOnly={TEACHER_ONLY}
      />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {role === "pm" && pmPage === "overview" && <PmOverview />}
          {role === "pm" && pmPage === "timeline" && <IntakeTimeline />}
          {role === "pm" && pmPage === "workload" && <WorkloadChart />}
          {role === "pm" && pmPage === "scenario" && <ScenarioSim />}
          {role === "pm" && pmPage === "intakes" && <IntakeManager />}
          {role === "pm" && pmPage === "aug2026" && <Aug2026Sim />}
          {role === "teacher" && teacherPage === "dashboard" && (
            <TeacherDashboard />
          )}
          {role === "teacher" && teacherPage === "grading" && (
            <GradingDeadlines />
          )}
          {role === "teacher" && teacherPage === "courses" && (
            <CourseDirectory />
          )}
          {role === "teacher" && teacherPage === "accesslist" && (
            <IntakeTimeline />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
