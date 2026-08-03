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
import { CourseResponsibilitiesAug2026 } from "./components/teacher/CourseResponsibilitiesAug2026";
import { AccessListAug2026 } from "./components/teacher/AccessListAug2026";
import { GradingDeadlinesAug2026 } from "./components/teacher/GradingDeadlinesAug2026";
import { TeacherDashboard2026 } from "./components/teacher/TeacherDashboard2026";
import { getPersistedTeacher, persistSelectedTeacher } from "./store";

type PmPage = "overview" | "timeline" | "workload" | "scenario" | "intakes" | "aug2026";
type TeacherPage = "dashboard" | "grading" | "courses" | "accesslist" | "aug2026courses" | "aug2026accesslist" | "aug2026grading" | "aug2026dashboard";

const TEACHER_ONLY = import.meta.env.VITE_ROLE === "teacher";

function App() {
  const [role, setRole] = useState<Role>(TEACHER_ONLY ? "teacher" : "pm");
  const [pmPage, setPmPage] = useState<PmPage>("overview");
  const [teacherPage, setTeacherPage] = useState<TeacherPage>("dashboard");
  const [selectedTeacher, setSelectedTeacher] = useState<string>(getPersistedTeacher);

  function handleTeacherChange(name: string) {
    setSelectedTeacher(name);
    persistSelectedTeacher(name);
  }

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
            <TeacherDashboard selectedTeacher={selectedTeacher} onTeacherChange={handleTeacherChange} />
          )}
          {role === "teacher" && teacherPage === "grading" && (
            <GradingDeadlines selectedTeacher={selectedTeacher} onTeacherChange={handleTeacherChange} />
          )}
          {role === "teacher" && teacherPage === "courses" && (
            <CourseDirectory />
          )}
          {role === "teacher" && teacherPage === "accesslist" && (
            <IntakeTimeline />
          )}
          {role === "teacher" && teacherPage === "aug2026courses" && (
            <CourseResponsibilitiesAug2026 />
          )}
          {role === "teacher" && teacherPage === "aug2026accesslist" && (
            <AccessListAug2026 />
          )}
          {role === "teacher" && teacherPage === "aug2026grading" && (
            <GradingDeadlinesAug2026 />
          )}
          {role === "teacher" && teacherPage === "aug2026dashboard" && (
            <TeacherDashboard2026 selectedTeacher={selectedTeacher} onTeacherChange={handleTeacherChange} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
