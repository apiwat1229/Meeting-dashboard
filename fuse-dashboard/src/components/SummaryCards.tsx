import { Box, Card, Stack, Typography } from "@mui/material";
import type { Report } from "@/types";

export function SummaryCards({ report }: { report: Report }) {
  const openIssues = report.issues.filter((i) => i.state === "OPEN");
  const todayActs = report.activities.filter((a) => a.section === "TODAY");
  const done = todayActs.filter((a) => a.completed).length;
  const abnormal = report.services.filter((s) => s.status === "ABNORMAL").length;
  const avg = report.projects.length ? Math.round(report.projects.reduce((s, p) => s + p.progress, 0) / report.projects.length) : 0;
  const cards = [
    { title: "งานวันนี้", value: todayActs.length - done, unit: "ยังไม่เสร็จ", foot: ["เสร็จแล้ว", done], tone: "text.primary" },
    { title: "โปรเจกต์", value: report.projects.length, unit: "ทั้งหมด", foot: ["ความคืบหน้าเฉลี่ย", `${avg}%`], tone: "primary.main" },
    { title: "ประเด็น", value: openIssues.length, unit: "เปิดอยู่", foot: ["ความเสี่ยงสูง", openIssues.filter((i) => i.severity === "HIGH").length], tone: openIssues.length ? "error.main" : "success.main" },
    { title: "ระบบผิดปกติ", value: abnormal, unit: "บริการ", foot: ["ทั้งหมด", report.services.length], tone: abnormal ? "error.main" : "success.main" },
  ];
  return (
    <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
      {cards.map((c) => (
        <Card key={c.title} sx={{ p: 2.5, textAlign: "center" }}>
          <Typography variant="subtitle2" sx={{ textAlign: "left" }}>{c.title}</Typography>
          <Typography sx={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, mt: 1, color: c.tone }}>{c.value}</Typography>
          <Typography fontWeight={600}>{c.unit}</Typography>
          <Stack direction="row" justifyContent="center" spacing={1} sx={{ mt: 2, color: "text.secondary" }}><Typography variant="body2">{c.foot[0]}:</Typography><Typography variant="body2" fontWeight={700} color="text.primary">{c.foot[1]}</Typography></Stack>
        </Card>
      ))}
    </Box>
  );
}
