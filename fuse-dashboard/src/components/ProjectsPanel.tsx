import { useState } from "react";
import { Box, Button, Chip, Collapse, IconButton, LinearProgress, List, ListItem, ListItemText, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/FolderOpen";
import { nextId } from "@/api/hooks";
import type { Project, Report, Task, TaskStatus } from "@/types";
import { FormDialog, type Field } from "./FormDialog";
import { Panel, statusColor } from "./Panel";

export interface PanelProps { report: Report; update: (fn: (r: Report) => Report) => void; readOnly?: boolean }

const statusOptions = ["ON_TRACK", "ATTENTION", "DELAY", "FINISH"].map((v) => ({ value: v, label: v.replace("_", " ") }));
const projectFields: Field[] = [
  { name: "name", label: "ชื่อโปรเจกต์", required: true }, { name: "status", label: "สถานะ", type: "select", options: statusOptions },
  { name: "progress", label: "ความคืบหน้า (%)", type: "number", min: 0, max: 100 }, { name: "startDate", label: "เริ่ม", type: "date" }, { name: "endDate", label: "สิ้นสุด", type: "date" },
  { name: "yesterday", label: "เมื่อวาน", type: "multiline" }, { name: "today", label: "วันนี้", type: "multiline" },
];
const taskFields: Field[] = [
  { name: "title", label: "ชื่องานย่อย", required: true },
  { name: "status", label: "สถานะ", type: "select", options: [{ value: "TODO", label: "To do" }, { value: "IN_PROGRESS", label: "In progress" }, { value: "DONE", label: "Done" }] },
];
const taskLabel: Record<TaskStatus, string> = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };

export function ProjectsPanel({ report, update, readOnly }: PanelProps) {
  const [edit, setEdit] = useState<Partial<Project> | null>(null);
  const [taskEdit, setTaskEdit] = useState<{ projectId: number; task: Partial<Task> } | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});

  const saveProject = (v: Partial<Project>) => update((r) => {
    const old = r.projects.find((p) => p.id === v.id);
    if (old) {
      const history = [...old.history];
      (["status", "progress", "startDate", "endDate"] as const).forEach((k) => { if (String(old[k] ?? "") !== String(v[k] ?? "")) history.push({ at: new Date().toISOString(), field: k, oldValue: String(old[k] ?? ""), newValue: String(v[k] ?? "") }); });
      return { ...r, projects: r.projects.map((p) => (p.id === v.id ? { ...p, ...v, history } as Project : p)) };
    }
    return { ...r, projects: [...r.projects, { id: nextId(), seriesId: crypto.randomUUID(), status: "ON_TRACK", progress: 0, yesterday: "", today: "", tasks: [], history: [], ...v } as Project] };
  });
  const saveTask = (projectId: number, v: Partial<Task>) => update((r) => ({
    ...r, projects: r.projects.map((p) => p.id !== projectId ? p : { ...p, tasks: v.id ? p.tasks.map((t) => (t.id === v.id ? { ...t, ...v } : t)) : [...p.tasks, { id: nextId(), status: "TODO", ...v } as Task] }),
  }));

  return (
    <Panel title="โปรเจกต์" icon={<FolderIcon />} action={!readOnly && <Button size="small" startIcon={<AddIcon />} onClick={() => setEdit({})}>เพิ่ม</Button>}>
      <Stack divider={<Box sx={{ borderTop: 1, borderColor: "divider" }} />} spacing={1.5}>
        {report.projects.length === 0 && <Typography color="text.secondary">ยังไม่มีโปรเจกต์</Typography>}
        {report.projects.map((p) => (
          <Box key={p.id}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <IconButton size="small" onClick={() => setOpen((o) => ({ ...o, [p.id]: !o[p.id] }))}><ExpandMoreIcon sx={{ transform: open[p.id] ? "rotate(180deg)" : "none" }} /></IconButton>
              <Typography fontWeight={600} sx={{ flex: 1 }}>{p.name}</Typography>
              <Chip size="small" color={statusColor[p.status]} label={p.status.replace("_", " ")} />
              {!readOnly && <><IconButton size="small" onClick={() => setEdit(p)}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => update((r) => ({ ...r, projects: r.projects.filter((x) => x.id !== p.id) }))}><DeleteIcon fontSize="small" /></IconButton></>}
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: 5 }}>
              <LinearProgress variant="determinate" value={p.progress} sx={{ flex: 1, height: 8, borderRadius: 4 }} />
              <Typography variant="caption">{p.progress}%</Typography>
            </Stack>
            {(p.yesterday || p.today) && <Typography variant="body2" color="text.secondary" sx={{ pl: 5, pt: 0.5 }}>เมื่อวาน: {p.yesterday || "-"} · วันนี้: {p.today || "-"}</Typography>}
            <Collapse in={!!open[p.id]}>
              <List dense sx={{ pl: 4 }}>
                {p.tasks.map((t) => (
                  <ListItem key={t.id} disableGutters secondaryAction={!readOnly && <><IconButton size="small" onClick={() => setTaskEdit({ projectId: p.id, task: t })}><EditIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => update((r) => ({ ...r, projects: r.projects.map((x) => x.id === p.id ? { ...x, tasks: x.tasks.filter((y) => y.id !== t.id) } : x) }))}><DeleteIcon fontSize="small" /></IconButton></>}>
                    <ListItemText primary={t.title} secondary={taskLabel[t.status]} slotProps={{ primary: { sx: { textDecoration: t.status === "DONE" ? "line-through" : "none" } } }} />
                  </ListItem>
                ))}
                {!readOnly && <Button size="small" startIcon={<AddIcon />} onClick={() => setTaskEdit({ projectId: p.id, task: {} })}>เพิ่มงานย่อย</Button>}
                {p.history.length > 0 && <Typography variant="caption" color="text.secondary" display="block" sx={{ pt: 1 }}>ประวัติ: {p.history.slice(-3).map((h) => `${h.field} ${h.oldValue || "-"} → ${h.newValue || "-"}`).join(" · ")}</Typography>}
              </List>
            </Collapse>
          </Box>
        ))}
      </Stack>
      {edit && <FormDialog open title={edit.id ? "แก้ไขโปรเจกต์" : "เพิ่มโปรเจกต์"} fields={projectFields} initial={{ status: "ON_TRACK", progress: 0, ...edit }} onClose={() => setEdit(null)} onSubmit={(v) => { saveProject({ ...v, id: edit.id }); setEdit(null); }} />}
      {taskEdit && <FormDialog open title="งานย่อย" fields={taskFields} initial={{ status: "TODO", ...taskEdit.task }} onClose={() => setTaskEdit(null)} onSubmit={(v) => { saveTask(taskEdit.projectId, { ...v, id: taskEdit.task.id }); setTaskEdit(null); }} />}
    </Panel>
  );
}
