import { Box, Card, CardContent, Typography } from "@mui/material";
import type { Report } from "@/types";

export function SummaryCards({ report }: { report: Report }) {
  const openIssues = report.issues.filter((i) => i.state === "OPEN").length;
  const avg = report.projects.length ? Math.round(report.projects.reduce((s, p) => s + p.progress, 0) / report.projects.length) : 0;
  const todayActs = report.activities.filter((a) => a.section === "TODAY");
  const abnormal = report.services.filter((s) => s.status === "ABNORMAL").length;
  const cards = [
    { label: "โปรเจกต์", value: report.projects.length, sub: `เฉลี่ย ${avg}%` },
    { label: "ประเด็นที่เปิดอยู่", value: openIssues, sub: `${report.issues.length} ทั้งหมด`, tone: openIssues ? "error.main" : undefined },
    { label: "กิจกรรมวันนี้", value: `${todayActs.filter((a) => a.completed).length}/${todayActs.length}`, sub: "เสร็จแล้ว" },
    { label: "ระบบผิดปกติ", value: abnormal, sub: `${report.services.length} บริการ`, tone: abnormal ? "error.main" : "success.main" },
  ];
  return (
    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
      {cards.map((c) => <Card key={c.label}><CardContent><Typography variant="body2" color="text.secondary">{c.label}</Typography>
        <Typography variant="h4" fontWeight={700} color={c.tone}>{c.value}</Typography><Typography variant="caption" color="text.secondary">{c.sub}</Typography></CardContent></Card>)}
    </Box>
  );
}
