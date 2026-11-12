import { useState } from "react";
import { Box, Button, Checkbox, Chip, IconButton, LinearProgress, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ChecklistIcon from "@mui/icons-material/Checklist";
import { nextId } from "@/api/hooks";
import type { Activity, ActivitySection } from "@/types";
import { FormDialog, type Field } from "./FormDialog";
import { Panel } from "./Panel";
import type { PanelProps } from "./ProjectsPanel";

const fields: Field[] = [
  { name: "content", label: "กิจกรรม", required: true },
  { name: "section", label: "ช่วงเวลา", type: "select", options: [{ value: "YESTERDAY", label: "เมื่อวาน" }, { value: "TODAY", label: "วันนี้" }] },
  { name: "category", label: "หมวด", type: "select", options: ["CSR", "GA", "SUPPORT", "GENERAL"].map((v) => ({ value: v, label: v })) },
  { name: "severity", label: "ความสำคัญ", type: "select", options: [{ value: "HIGH", label: "สูง" }, { value: "MEDIUM", label: "ปกติ" }] },
  { name: "progress", label: "ความคืบหน้า (%)", type: "number", min: 0, max: 100 },
  { name: "description", label: "รายละเอียด", type: "multiline" },
  { name: "supplierRequired", label: "ต้องใช้ Supplier", type: "checkbox" }, { name: "supplierName", label: "ชื่อ Supplier" },
  { name: "supplierContact", label: "ผู้ติดต่อ" }, { name: "supplierPhone", label: "โทรศัพท์" },
  { name: "beforeReason", label: "ก่อนดำเนินการ", type: "multiline" }, { name: "afterReason", label: "หลังดำเนินการ", type: "multiline" },
];

export function ActivitiesPanel({ report, update, readOnly, category }: PanelProps & { category?: Activity["category"] }) {
  const [edit, setEdit] = useState<Partial<Activity> | null>(null);
  const save = (v: Partial<Activity>) => update((r) => v.id ? { ...r, activities: r.activities.map((a) => (a.id === v.id ? { ...a, ...v } : a)) }
    : { ...r, activities: [...r.activities, { id: nextId(), completed: false, progress: 0, description: "", supplierRequired: false, supplierName: "", supplierContact: "", supplierPhone: "", beforeReason: "", afterReason: "", images: [], ...v } as Activity] });
  const toggle = (id: number) => update((r) => ({ ...r, activities: r.activities.map((a) => a.id === id ? { ...a, completed: !a.completed, progress: !a.completed ? 100 : a.progress } : a) }));
  const list = (section: ActivitySection) => report.activities.filter((a) => a.section === section && (!category || a.category === category));

  const column = (section: ActivitySection, title: string) => (
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{title}</Typography>
      <Stack spacing={1}>
        {list(section).length === 0 && <Typography variant="body2" color="text.secondary">-</Typography>}
        {list(section).map((a) => (
          <Stack key={a.id} direction="row" alignItems="flex-start" spacing={0.5} sx={{ p: 1, border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Checkbox size="small" checked={a.completed} disabled={readOnly} onChange={() => toggle(a.id)} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                <Typography fontWeight={600} sx={{ textDecoration: a.completed ? "line-through" : "none" }}>{a.content}</Typography>
                <Chip size="small" variant="outlined" label={a.category} />{a.severity === "HIGH" && <Chip size="small" color="error" label="สำคัญ" />}
              </Stack>
              {a.description && <Typography variant="body2" color="text.secondary">{a.description}</Typography>}
              {a.supplierRequired && <Typography variant="caption" color="text.secondary">Supplier: {a.supplierName} {a.supplierPhone}</Typography>}
              <LinearProgress variant="determinate" value={a.progress} sx={{ mt: 0.5, height: 6, borderRadius: 3 }} />
            </Box>
            {!readOnly && <><IconButton size="small" onClick={() => setEdit(a)}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => update((r) => ({ ...r, activities: r.activities.filter((x) => x.id !== a.id) }))}><DeleteIcon fontSize="small" /></IconButton></>}
          </Stack>
        ))}
      </Stack>
    </Box>
  );

  return (
    <Panel title="กิจกรรม" icon={<ChecklistIcon />} action={!readOnly && <Button size="small" startIcon={<AddIcon />} onClick={() => setEdit({ section: "TODAY", category: category ?? "GENERAL" })}>เพิ่ม</Button>}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>{column("YESTERDAY", "เมื่อวาน")}{column("TODAY", "วันนี้")}</Stack>
      {edit && <FormDialog open title={edit.id ? "แก้ไขกิจกรรม" : "เพิ่มกิจกรรม"} fields={fields} initial={{ section: "TODAY", category: "GENERAL", severity: "MEDIUM", progress: 0, supplierRequired: false, ...edit }} onClose={() => setEdit(null)} onSubmit={(v) => { save({ ...v, id: edit.id }); setEdit(null); }} />}
    </Panel>
  );
}
