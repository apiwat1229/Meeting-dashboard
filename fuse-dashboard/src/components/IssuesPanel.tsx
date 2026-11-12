import { useState } from "react";
import { Box, Button, Chip, IconButton, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import WarningIcon from "@mui/icons-material/WarningAmber";
import { nextId } from "@/api/hooks";
import type { Issue } from "@/types";
import { FormDialog, type Field } from "./FormDialog";
import { Panel, severityColor } from "./Panel";
import type { PanelProps } from "./ProjectsPanel";

export function IssuesPanel({ report, update, readOnly }: PanelProps) {
  const [edit, setEdit] = useState<Partial<Issue> | null>(null);
  const fields: Field[] = [
    { name: "title", label: "หัวข้อ", required: true },
    { name: "severity", label: "ความรุนแรง", type: "select", options: ["HIGH", "MEDIUM", "LOW"].map((v) => ({ value: v, label: v })) },
    { name: "state", label: "สถานะ", type: "select", options: [{ value: "OPEN", label: "เปิด" }, { value: "CLOSED", label: "ปิดแล้ว" }] },
    { name: "projectId", label: "โปรเจกต์ที่เกี่ยวข้อง", type: "select", options: [{ value: "", label: "-" }, ...report.projects.map((p) => ({ value: String(p.id), label: p.name }))] },
    { name: "detail", label: "รายละเอียด", type: "multiline" }, { name: "nextStep", label: "ขั้นตอนถัดไป", type: "multiline" }, { name: "prevention", label: "การป้องกัน", type: "multiline" },
  ];
  const save = (v: Partial<Issue>) => update((r) => {
    const value = { ...v, projectId: v.projectId ? Number(v.projectId) : undefined };
    return v.id ? { ...r, issues: r.issues.map((i) => (i.id === v.id ? { ...i, ...value } : i)) }
      : { ...r, issues: [...r.issues, { id: nextId(), severity: "MEDIUM", state: "OPEN", detail: "", nextStep: "", prevention: "", images: [], ...value } as Issue] };
  });
  const open = report.issues.filter((i) => i.state === "OPEN");

  return (
    <Panel title={`ประเด็นเร่งด่วน (${open.length})`} icon={<WarningIcon />} action={!readOnly && <Button size="small" startIcon={<AddIcon />} onClick={() => setEdit({})}>เพิ่ม</Button>}>
      <Stack spacing={1.5}>
        {report.issues.length === 0 && <Typography color="text.secondary">ไม่มีประเด็น</Typography>}
        {report.issues.map((i) => (
          <Box key={i.id} sx={{ p: 1.5, border: 1, borderColor: "divider", borderRadius: 1, opacity: i.state === "CLOSED" ? 0.6 : 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Chip size="small" color={severityColor[i.severity]} label={i.severity} />
              <Typography fontWeight={600} sx={{ flex: 1 }}>{i.title}</Typography>
              {i.state === "CLOSED" && <Chip size="small" label="ปิดแล้ว" />}
              {!readOnly && <><IconButton size="small" onClick={() => setEdit({ ...i, projectId: i.projectId ? String(i.projectId) as unknown as number : undefined })}><EditIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => update((r) => ({ ...r, issues: r.issues.filter((x) => x.id !== i.id) }))}><DeleteIcon fontSize="small" /></IconButton></>}
            </Stack>
            {i.detail && <Typography variant="body2" color="text.secondary">{i.detail}</Typography>}
            {i.nextStep && <Typography variant="body2">ถัดไป: {i.nextStep}</Typography>}
          </Box>
        ))}
      </Stack>
      {edit && <FormDialog open title={edit.id ? "แก้ไขประเด็น" : "เพิ่มประเด็น"} fields={fields} initial={{ severity: "MEDIUM", state: "OPEN", projectId: "", ...edit }} onClose={() => setEdit(null)} onSubmit={(v) => { save({ ...v, id: edit.id }); setEdit(null); }} />}
    </Panel>
  );
}
