import { useState } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { Alert, Box, Chip, CircularProgress, Stack, Tab, Tabs } from "@mui/material";
import { useAuth } from "@/auth/AuthContext";
import { useDepartments, useReport, useReportUpdate } from "@/api/hooks";
import { todayKey } from "@/api/store";
import type { Report } from "@/types";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { CctvPanel } from "@/components/CctvPanel";
import { IssueSummary, ProjectProgressChart } from "@/components/Charts";
import { IssuesPanel } from "@/components/IssuesPanel";
import { PageHeader } from "@/components/PageHeader";
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

const two = { display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } };

export function Dashboard() {
  const { user } = useAuth();
  const { department: code } = useParams();
  const [params] = useSearchParams();
  const [tab, setTab] = useState(0);
  const date = params.get("date") ?? todayKey();
  const { data: deps } = useDepartments();
  const dep = deps?.find((d) => d.code === code);
  // Same rule as getAccessibleDepartment: USER is pinned to their own department, ADMIN may open any active one.
  const allowed = dep && dep.isActive && (user?.role === "ADMIN" || dep.id === user?.departmentId);
  const { data: report } = useReport(dep?.id ?? 0, date);
  const mutation = useReportUpdate(dep?.id ?? 0, date);
  if (!deps) return <CircularProgress />;
  if (!allowed) { const own = user && deps.find((d) => d.id === user.departmentId); return own ? <Navigate to={`/dashboard/${own.code}`} replace /> : <Alert severity="error">ไม่มีสิทธิ์เข้าถึงแผนกนี้</Alert>; }
  if (!report) return <CircularProgress />;

  const props = { report, update: (fn: (r: Report) => Report) => mutation.mutate(fn) };
  const header = (
    <PageHeader crumbs={["Home", "Dashboards", dep.name]} avatar={dep.name.slice(0, 1)} title={`${dep.name} · Daily Status & Operations`}
      subtitle={`${report.purpose} · รายงาน ${date} เวลา ${report.reportTime}${report.copiedFrom ? ` · คัดลอกจาก ${report.copiedFrom}` : ""}`} />
  );
  if (dep.code === "CSR-GA") return <>{header}<CsrGaDashboard {...props} /></>;

  return (
    <Stack spacing={2.5}>
      {header}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} slotProps={{ indicator: { sx: { display: "none" } } }}
        sx={{ alignSelf: "flex-start", minHeight: 0, p: 0.5, bgcolor: "action.hover", borderRadius: 999, "& .Mui-selected": { bgcolor: "background.paper", boxShadow: 1, color: "text.primary !important" } }}>
        <Tab label="ภาพรวม" /><Tab label={<Stack direction="row" spacing={1} alignItems="center"><span>โปรเจกต์</span><Chip size="small" label={report.projects.length} /></Stack>} /><Tab label="กิจกรรม" /><Tab label="ระบบ & CCTV" />
      </Tabs>
      {tab === 0 && <>
        <SummaryCards report={report} />
        <TodayFocus {...props} />
        <Box sx={two}><ProjectProgressChart report={report} /><IssueSummary report={report} /></Box>
        <IssuesPanel {...props} />
      </>}
      {tab === 1 && <ProjectsPanel {...props} />}
      {tab === 2 && <ActivitiesPanel {...props} />}
      {tab === 3 && <Box sx={two}><SystemStatusPanel {...props} /><CctvPanel {...props} /></Box>}
    </Stack>
  );
}
