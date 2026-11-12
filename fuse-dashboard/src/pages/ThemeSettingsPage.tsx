import { Button, Card, CardContent, MenuItem, Slider, Stack, TextField, Typography } from "@mui/material";
import { defaultTheme } from "@/api/store";
import type { ThemeSettings } from "@/types";

export function ThemeSettingsPage({ theme, onChange }: { theme: ThemeSettings; onChange: (t: ThemeSettings) => void }) {
  return (
    <Card sx={{ maxWidth: 520 }}><CardContent><Stack spacing={2.5}>
      <Typography variant="h5">ตั้งค่าธีม</Typography>
      <TextField select size="small" label="โหมด" value={theme.mode} onChange={(e) => onChange({ ...theme, mode: e.target.value as ThemeSettings["mode"] })}>
        <MenuItem value="light">สว่าง</MenuItem><MenuItem value="dark">มืด</MenuItem></TextField>
      <TextField size="small" type="color" label="สีหลัก" value={theme.primary} onChange={(e) => onChange({ ...theme, primary: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />
      <div><Typography variant="body2">มุมโค้ง: {theme.radius}px</Typography><Slider min={0} max={24} value={theme.radius} onChange={(_, v) => onChange({ ...theme, radius: v as number })} /></div>
      <Button onClick={() => onChange(defaultTheme)}>คืนค่าเริ่มต้น</Button>
    </Stack></CardContent></Card>
  );
}
