import { useState } from "react";
import { Box, Button, Checkbox, FormControlLabel, Stack, TextField, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import CenterFocusIcon from "@mui/icons-material/CenterFocusStrong";
import { Panel } from "./Panel";
import type { PanelProps } from "./ProjectsPanel";

export function TodayFocus({ report, update, readOnly }: PanelProps) {
  const f = report.focus;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(f);
  const projects = report.projects.filter((p) => f.projectIds.includes(p.id));
  const toggle = (key: "projectIds" | "taskIds", id: number) => setDraft((d) => ({ ...d, [key]: d[key].includes(id) ? d[key].filter((x) => x !== id) : [...d[key], id] }));
  return (
    <Panel title="Today Focus" icon={<CenterFocusIcon />} action={!readOnly && <Button size="small" color="inherit" variant="outlined" onClick={() => { setDraft(f); setOpen(true); }}>ตั้งค่า</Button>}
      sx={{ background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`, color: "#fff", "& .MuiTypography-root, & svg": { color: "inherit" } }}>
      <Typography variant="h5">{f.title}</Typography>
      {f.detail && <Typography sx={{ opacity: 0.85 }}>{f.detail}</Typography>}
      <Stack spacing={0.5} sx={{ mt: 1 }}>
        {projects.map((p) => (
          <Box key={p.id}><Typography fontWeight={600}>{p.name} · {p.progress}%</Typography>
            {p.tasks.filter((t) => f.taskIds.includes(t.id)).map((t) => <Typography key={t.id} variant="body2" sx={{ pl: 2 }}>• {t.title}</Typography>)}</Box>
        ))}
      </Stack>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>ตั้งค่า Today Focus</DialogTitle>
        <DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}>
          <TextField size="small" label="หัวข้อ" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          <TextField size="small" label="รายละเอียด" multiline minRows={2} value={draft.detail} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} />
          {report.projects.map((p) => (
            <Box key={p.id}>
              <FormControlLabel label={p.name} control={<Checkbox checked={draft.projectIds.includes(p.id)} onChange={() => toggle("projectIds", p.id)} />} />
              {draft.projectIds.includes(p.id) && p.tasks.map((t) => <FormControlLabel key={t.id} sx={{ pl: 3, display: "flex" }} label={t.title} control={<Checkbox size="small" checked={draft.taskIds.includes(t.id)} onChange={() => toggle("taskIds", t.id)} />} />)}
            </Box>
          ))}
        </Stack></DialogContent>
        <DialogActions><Button onClick={() => setOpen(false)}>ยกเลิก</Button><Button variant="contained" onClick={() => { update((r) => ({ ...r, focus: draft })); setOpen(false); }}>บันทึก</Button></DialogActions>
      </Dialog>
    </Panel>
  );
}
