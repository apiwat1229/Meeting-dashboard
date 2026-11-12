import { useState } from "react";
import { Box, Button, Chip, IconButton, Stack, Switch, FormControlLabel, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import VideocamIcon from "@mui/icons-material/Videocam";
import { nextId } from "@/api/hooks";
import type { Cctv, CctvCase } from "@/types";
import { FormDialog, type Field } from "./FormDialog";
import { Panel } from "./Panel";
import type { PanelProps } from "./ProjectsPanel";

const countFields: Field[] = [
  { name: "cameraCount", label: "กล้องทั้งหมด", type: "number", min: 0 }, { name: "faulty", label: "กล้องเสีย", type: "number", min: 0 },
  { name: "waitingRepair", label: "รอซ่อม", type: "number", min: 0 }, { name: "repairing", label: "กำลังซ่อม", type: "number", min: 0 }, { name: "installing", label: "กำลังติดตั้ง", type: "number", min: 0 },
  { name: "recorderStatus", label: "สถานะ Recorder" }, { name: "faultReason", label: "สาเหตุที่เสีย", type: "multiline" },
];
const caseFields: Field[] = [
  { name: "title", label: "หัวข้อ", required: true }, { name: "meetingDate", label: "วันประชุม", type: "date" },
  { name: "status", label: "สถานะ", type: "select", options: [{ value: "READY", label: "พร้อม" }, { value: "IN_PROGRESS", label: "กำลังดำเนินการ" }, { value: "FOLLOW_UP", label: "ติดตาม" }] },
  { name: "detail", label: "รายละเอียด", type: "multiline" },
];
const caseColor = { READY: "success", IN_PROGRESS: "warning", FOLLOW_UP: "info" } as const;

export function CctvPanel({ report, update, readOnly }: PanelProps) {
  const c = report.cctv;
  const [editCounts, setEditCounts] = useState(false);
  const [editCase, setEditCase] = useState<Partial<CctvCase> | null>(null);
  const patch = (fn: (c: Cctv) => Cctv) => update((r) => ({ ...r, cctv: fn(r.cctv) }));
  const stat = (label: string, value: number | string, tone?: string) => (
    <Box sx={{ textAlign: "center", p: 1, flex: 1, minWidth: 80 }}><Typography variant="h5" color={tone}>{value}</Typography><Typography variant="caption" color="text.secondary">{label}</Typography></Box>
  );
  return (
    <Panel title="CCTV" icon={<VideocamIcon />} action={!readOnly && <Button size="small" startIcon={<EditIcon />} onClick={() => setEditCounts(true)}>แก้ไข</Button>}>
      <Stack direction="row" flexWrap="wrap" sx={{ mb: 2 }}>
        {stat("กล้องทั้งหมด", c.cameraCount)}{stat("เสีย", c.faulty, c.faulty ? "error.main" : undefined)}{stat("รอซ่อม", c.waitingRepair)}{stat("กำลังซ่อม", c.repairing)}{stat("กำลังติดตั้ง", c.installing)}{stat("Recorder", c.recorderStatus, c.recorderStatus === "OK" ? "success.main" : "error.main")}
      </Stack>
      {c.faultReason && <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>สาเหตุ: {c.faultReason}</Typography>}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2">เคสสำหรับประชุม CCTV</Typography>
        {!readOnly && <Stack direction="row" alignItems="center">
          <FormControlLabel label="แสดง" control={<Switch size="small" checked={c.meetingVisible} onChange={(e) => patch((x) => ({ ...x, meetingVisible: e.target.checked }))} />} />
          <Button size="small" startIcon={<AddIcon />} onClick={() => setEditCase({})}>เพิ่มเคส</Button></Stack>}
      </Stack>
      {c.meetingVisible && <Stack spacing={1} sx={{ mt: 1 }}>
        {c.cases.length === 0 && <Typography variant="body2" color="text.secondary">ไม่มีเคส</Typography>}
        {c.cases.map((k) => (
          <Stack key={k.id} direction="row" alignItems="center" spacing={1} sx={{ p: 1, border: 1, borderColor: "divider", borderRadius: 1 }}>
            <Box sx={{ flex: 1 }}><Typography fontWeight={600}>{k.title}</Typography><Typography variant="body2" color="text.secondary">{k.meetingDate} {k.detail}</Typography></Box>
            <Chip size="small" color={caseColor[k.status]} label={k.status.replace("_", " ")} />
            {!readOnly && <><IconButton size="small" onClick={() => setEditCase(k)}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => patch((x) => ({ ...x, cases: x.cases.filter((y) => y.id !== k.id) }))}><DeleteIcon fontSize="small" /></IconButton></>}
          </Stack>
        ))}
      </Stack>}
      {editCounts && <FormDialog open title="สถานะกล้อง CCTV" fields={countFields} initial={c as unknown as Record<string, unknown>} onClose={() => setEditCounts(false)} onSubmit={(v) => { patch((x) => ({ ...x, ...(v as Partial<Cctv>) })); setEditCounts(false); }} />}
      {editCase && <FormDialog open title="เคสประชุม" fields={caseFields} initial={{ status: "IN_PROGRESS", ...editCase }} onClose={() => setEditCase(null)}
        onSubmit={(v) => { patch((x) => ({ ...x, cases: editCase.id ? x.cases.map((y) => (y.id === editCase.id ? { ...y, ...v } as CctvCase : y)) : [...x.cases, { id: `case-${nextId()}`, ...v } as CctvCase] })); setEditCase(null); }} />}
    </Panel>
  );
}
