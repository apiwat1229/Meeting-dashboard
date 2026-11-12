import { useState } from "react";
import { Box, Button, Chip, IconButton, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import LanIcon from "@mui/icons-material/Lan";
import { nextId } from "@/api/hooks";
import type { ServiceStatus } from "@/types";
import { FormDialog, type Field } from "./FormDialog";
import { Panel } from "./Panel";
import type { PanelProps } from "./ProjectsPanel";

const fields: Field[] = [
  { name: "label", label: "ระบบ/บริการ", required: true },
  { name: "status", label: "สถานะ", type: "select", options: [{ value: "NORMAL", label: "ปกติ" }, { value: "ABNORMAL", label: "ผิดปกติ" }, { value: "UNKNOWN", label: "ไม่ทราบ" }] },
  { name: "reason", label: "สาเหตุ/หมายเหตุ", type: "multiline" },
];
const color = { NORMAL: "success", ABNORMAL: "error", UNKNOWN: "default" } as const;
const text = { NORMAL: "ปกติ", ABNORMAL: "ผิดปกติ", UNKNOWN: "ไม่ทราบ" } as const;

export function SystemStatusPanel({ report, update, readOnly }: PanelProps) {
  const [edit, setEdit] = useState<Partial<ServiceStatus> | null>(null);
  const save = (v: Partial<ServiceStatus>) => update((r) => v.id ? { ...r, services: r.services.map((s) => (s.id === v.id ? { ...s, ...v } : s)) }
    : { ...r, services: [...r.services, { id: nextId(), status: "NORMAL", reason: "", ...v } as ServiceStatus] });
  return (
    <Panel title="สถานะ Network / Server" icon={<LanIcon />} action={!readOnly && <Button size="small" startIcon={<AddIcon />} onClick={() => setEdit({})}>เพิ่ม</Button>}>
      <Stack spacing={1}>
        {report.services.map((s) => (
          <Stack key={s.id} direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ flex: 1 }}>{s.label}{s.reason && <Box component="span" color="text.secondary"> — {s.reason}</Box>}</Typography>
            <Chip size="small" color={color[s.status]} label={text[s.status]} />
            {!readOnly && <><IconButton size="small" onClick={() => setEdit(s)}><EditIcon fontSize="small" /></IconButton>
              <IconButton size="small" onClick={() => update((r) => ({ ...r, services: r.services.filter((x) => x.id !== s.id) }))}><DeleteIcon fontSize="small" /></IconButton></>}
          </Stack>
        ))}
        {report.services.length === 0 && <Typography color="text.secondary">ยังไม่มีข้อมูล</Typography>}
      </Stack>
      {edit && <FormDialog open title="สถานะระบบ" fields={fields} initial={{ status: "NORMAL", ...edit }} onClose={() => setEdit(null)} onSubmit={(v) => { save({ ...v, id: edit.id }); setEdit(null); }} />}
    </Panel>
  );
}
