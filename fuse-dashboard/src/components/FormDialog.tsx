import { useState } from "react";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Stack, TextField } from "@mui/material";

export type Field = {
  name: string; label: string; type?: "text" | "number" | "date" | "multiline" | "select" | "checkbox" | "password";
  options?: { value: string; label: string }[]; required?: boolean; min?: number; max?: number;
};

/** Generic create/edit dialog; one component replaces the dozen bespoke editors of the original app. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FormDialog({ open, title, fields, initial, onClose, onSubmit }: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  open: boolean; title: string; fields: Field[]; initial: object; onClose: () => void; onSubmit: (values: any) => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(initial as Record<string, unknown>);
  const set = (name: string, v: unknown) => setValues((p) => ({ ...p, [name]: v }));
  const missing = fields.some((f) => f.required && !String(values[f.name] ?? "").trim());
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {fields.map((f) => f.type === "checkbox" ? (
            <FormControlLabel key={f.name} label={f.label} control={<Checkbox checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />} />
          ) : (
            <TextField key={f.name} label={f.label} size="small" required={f.required} select={f.type === "select"} multiline={f.type === "multiline"} minRows={f.type === "multiline" ? 3 : undefined}
              type={f.type === "number" || f.type === "date" || f.type === "password" ? f.type : "text"} slotProps={{ inputLabel: f.type === "date" ? { shrink: true } : undefined, htmlInput: { min: f.min, max: f.max } }}
              value={values[f.name] ?? ""} onChange={(e) => set(f.name, f.type === "number" ? Number(e.target.value) : e.target.value)}>
              {f.options?.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions><Button onClick={onClose}>ยกเลิก</Button><Button variant="contained" disabled={missing} onClick={() => onSubmit(values)}>บันทึก</Button></DialogActions>
    </Dialog>
  );
}
