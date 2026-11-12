import { Box, Card, CardContent, CardMedia, Stack, Typography } from "@mui/material";
import PhotoLibraryIcon from "@mui/icons-material/PhotoLibrary";
import { ActivitiesPanel } from "@/components/ActivitiesPanel";
import { IssuesPanel } from "@/components/IssuesPanel";
import { Panel } from "@/components/Panel";
import { SummaryCards } from "@/components/SummaryCards";
import type { PanelProps } from "@/components/ProjectsPanel";

/** CSR/GA variant: activity-first layout with a photo gallery (before / after / general). */
export function CsrGaDashboard({ report, update, departmentName }: PanelProps & { departmentName: string }) {
  const photos = report.activities.flatMap((a) => a.images.map((img) => ({ ...img, title: a.content })));
  return (
    <Stack spacing={2.5}>
      <Box><Typography variant="h5">{departmentName} Daily Activities</Typography><Typography color="text.secondary">{report.purpose}</Typography></Box>
      <SummaryCards report={report} />
      <ActivitiesPanel report={report} update={update} />
      <Panel title="แกลเลอรีรูปกิจกรรม" icon={<PhotoLibraryIcon />}>
        {photos.length === 0 ? <Typography color="text.secondary">ยังไม่มีรูป (อัปโหลดผ่าน /api/images เมื่อเชื่อม backend จริง)</Typography> : (
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))" }}>
            {photos.map((p, i) => <Card key={i}><CardMedia component="img" height="140" image={p.url} /><CardContent sx={{ py: 1 }}><Typography variant="body2">{p.title} · {p.phase}</Typography></CardContent></Card>)}
          </Box>)}
      </Panel>
      <IssuesPanel report={report} update={update} />
    </Stack>
  );
}
