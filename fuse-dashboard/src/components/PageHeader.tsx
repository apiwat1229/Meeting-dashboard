import type { ReactNode } from "react";
import { Avatar, Box, Breadcrumbs, Stack, Typography } from "@mui/material";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

export function PageHeader({ crumbs, title, subtitle, avatar, actions }: { crumbs: string[]; title: string; subtitle?: ReactNode; avatar?: string; actions?: ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Breadcrumbs separator={<NavigateNextIcon sx={{ fontSize: 16 }} />} sx={{ mb: 2, display: "inline-flex", px: 1.5, py: 0.5, bgcolor: "background.paper", borderRadius: 999, boxShadow: 1, "& .MuiBreadcrumbs-li": { fontSize: 13, fontWeight: 500 } }}>
        {crumbs.map((c, i) => <Typography key={c} variant="inherit" color={i === crumbs.length - 1 ? "text.primary" : "text.secondary"}>{c}</Typography>)}
      </Breadcrumbs>
      <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          {avatar && <Avatar sx={{ width: 52, height: 52, bgcolor: "primary.main", fontWeight: 700 }}>{avatar}</Avatar>}
          <Box><Typography variant="h5">{title}</Typography>{subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}</Box>
        </Stack>
        {actions}
      </Stack>
    </Box>
  );
}
