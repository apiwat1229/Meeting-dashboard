import { Box, Stack, Typography, useTheme } from "@mui/material";
import InsightsIcon from "@mui/icons-material/Insights";
import type { Report } from "@/types";
import { Panel } from "./Panel";

/** Bar chart: progress of each project (inline SVG, no chart library needed). */
export function ProjectProgressChart({ report }: { report: Report }) {
  const t = useTheme();
  const data = report.projects;
  const W = 520, H = 220, pad = { l: 34, b: 44, t: 16, r: 8 };
  const bw = data.length ? Math.min(48, (W - pad.l - pad.r) / data.length - 14) : 0;
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) / Math.max(data.length, 1)) * (i + 0.5);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / 100);
  const color = { ON_TRACK: t.palette.primary.main, ATTENTION: t.palette.warning.main, DELAY: t.palette.error.main, FINISH: t.palette.success.main };
  return (
    <Panel title="ความคืบหน้าโปรเจกต์" icon={<InsightsIcon />}>
      {data.length === 0 ? <Typography color="text.secondary">ยังไม่มีโปรเจกต์</Typography> : (
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="ความคืบหน้าโปรเจกต์">
          {[0, 25, 50, 75, 100].map((v) => <g key={v}><line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke={t.palette.divider} strokeDasharray="3 4" />
            <text x={pad.l - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill={t.palette.text.secondary}>{v}</text></g>)}
          {data.map((p, i) => (
            <g key={p.id}>
              <rect x={x(i) - bw / 2} y={y(p.progress)} width={bw} height={Math.max(y(0) - y(p.progress), 2)} rx={6} fill={color[p.status]} />
              <text x={x(i)} y={y(p.progress) - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill={t.palette.text.primary}>{p.progress}%</text>
              <text x={x(i)} y={H - 22} textAnchor="middle" fontSize="11" fill={t.palette.text.secondary}>{p.name.length > 14 ? p.name.slice(0, 13) + "…" : p.name}</text>
            </g>
          ))}
        </svg>
      )}
    </Panel>
  );
}

/** Big-number tiles for issues (open vs closed, by severity), like the "Github Issues Summary" card in Fuse. */
export function IssueSummary({ report }: { report: Report }) {
  const open = report.issues.filter((i) => i.state === "OPEN");
  const big = (value: number, label: string, color: string) => (
    <Box sx={{ flex: 1, textAlign: "center", py: 3, borderRadius: 3, bgcolor: "action.hover" }}>
      <Typography sx={{ fontSize: 48, fontWeight: 800, lineHeight: 1, color }}>{value}</Typography><Typography variant="body2" fontWeight={600} sx={{ color }}>{label}</Typography>
    </Box>
  );
  const small = (value: number, label: string) => (
    <Box sx={{ flex: 1, textAlign: "center", py: 1.5, borderRadius: 3, bgcolor: "action.hover" }}><Typography variant="h5">{value}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></Box>
  );
  return (
    <Panel title="สรุปประเด็น (Issues)" icon={<InsightsIcon />}>
      <Stack spacing={1.5}>
        <Stack direction="row" spacing={1.5}>{big(open.length, "เปิดอยู่", "#0EA5E9")}{big(report.issues.length - open.length, "ปิดแล้ว", "#16A34A")}</Stack>
        <Stack direction="row" spacing={1.5}>{small(open.filter((i) => i.severity === "HIGH").length, "สูง")}{small(open.filter((i) => i.severity === "MEDIUM").length, "กลาง")}{small(open.filter((i) => i.severity === "LOW").length, "ต่ำ")}</Stack>
      </Stack>
    </Panel>
  );
}
