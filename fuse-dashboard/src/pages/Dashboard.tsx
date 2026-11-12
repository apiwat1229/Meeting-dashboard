import { Navigate, useParams, useSearchParams } from "react-router-dom";
import type { Report } from "@/types";
import { Alert, Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useAuth } from "@/auth/AuthContext";
import { useDepartments, useReport, useReportUpdate } from "@/api/hooks";
import { todayKey } from "@/api/store";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { CctvPanel } from "@/components/CctvPanel";
import { IssuesPanel } from "@/components/IssuesPanel";
import { ProjectsPanel } from "@/components/ProjectsPanel";
import { SummaryCards } from "@/components/SummaryCards";
import { SystemStatusPanel } from "@/components/SystemStatusPanel";
import { TodayFocus } from "@/components/TodayFocus";
import { CsrGaDashboard } from "./CsrGaDashboard";

export function DepartmentHome() {
  const { user } = useAuth();
  const { data: deps } = useDepartments();
  const mine = deps?.find((d) => d.id === user?.departmentId);
  return mine ? <Navigate to={`/dashboard/${mine.code}`} replace /> : <CircularProgress />;
}

export function Dashboard() {
  const { user } = useAuth();
  const { department: code } = useParams();
  const [params] = useSearchParams();
  const date = params.get("date") ?? todayKey();
  const { data: deps } = useDepartments();
  const dep = deps?.find((d) => d.code === code);
  // Same rule as getAccessibleDepartment: USER is pinned to their own department, ADMIN may open any active one.
  const allowed = dep && dep.isActive && (user?.role === "ADMIN" || dep.id === user?.departmentId);
  const { data: report } = useReport(dep?.id ?? 0, date);
  const mutation = useReportUpdate(dep?.id ?? 0, date);
  if (!deps) return <CircularProgress />;
  if (!allowed) return user && deps.find((d) => d.id === user.departmentId) ? <Navigate to={`/dashboard/${deps.find((d) => d.id === user.departmentId)!.code}`} replace /> : <Alert severity="error">ไม่มีสิทธิ์เข้าถึงแผนกนี้</Alert>;
  if (!report) return <CircularProgress />;

  const props = { report, update: (fn: (r: Report) => Report) => mutation.mutate(fn) };
  if (dep.code === "CSR-GA") return <CsrGaDashboard {...props} departmentName={dep.name} />;
  return (
    <Stack spacing={2.5}>
      <Box><Typography variant="h5">{dep.name} Daily Status & Operations Summary</Typography>
        <Typography color="text.secondary">{report.purpose} · เวลารายงาน {report.reportTime}{report.copiedFrom && ` · คัดลอกจาก ${report.copiedFrom}`}</Typography></Box>
      <SummaryCards report={report} />
      <TodayFocus {...props} />
      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" } }}>
        <ProjectsPanel {...props} /><IssuesPanel {...props} />
      </Box>
      <ActivitiesPanel {...props} />
      <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" } }}>
        <SystemStatusPanel {...props} /><CctvPanel {...props} />
      </Box>
      <Typography variant="caption" color="text.secondary">{report.footnote}</Typography>
    </Stack>
  );
}
