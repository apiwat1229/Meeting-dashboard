import type { ReactNode } from "react";
import { Box, Card, CardContent, Stack, Typography, type SxProps, type Theme } from "@mui/material";

export function Panel({ title, icon, action, children, sx }: { title: string; icon?: ReactNode; action?: ReactNode; children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Card sx={sx}>
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center"><Box sx={{ display: "flex", color: "text.secondary" }}>{icon}</Box><Typography variant="h6">{title}</Typography></Stack>
          {action}
        </Stack>
        {children}
      </CardContent>
    </Card>
  );
}
export const statusColor = { ON_TRACK: "success", ATTENTION: "warning", DELAY: "error", FINISH: "info" } as const;
export const severityColor = { HIGH: "error", MEDIUM: "warning", LOW: "default" } as const;
