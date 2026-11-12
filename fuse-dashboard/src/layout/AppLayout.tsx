import { useState } from "react";
import { Outlet, NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, Menu, MenuItem, Select, Stack, TextField, Toolbar, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboardOutlined";
import PeopleIcon from "@mui/icons-material/PeopleOutline";
import BusinessIcon from "@mui/icons-material/BusinessOutlined";
import PaletteIcon from "@mui/icons-material/PaletteOutlined";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import DarkModeIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeIcon from "@mui/icons-material/LightModeOutlined";
import BoltIcon from "@mui/icons-material/Bolt";
import { useAuth } from "@/auth/AuthContext";
import { useDepartments } from "@/api/hooks";
import { todayKey } from "@/api/store";
import type { ThemeSettings } from "@/types";

const WIDTH = 270;

/** Fuse-style shell: light navbar, slim toolbar, centred content. "Presentation mode" hides chrome for meeting-room screens. */
export function AppLayout({ settings, onSettings }: { settings: ThemeSettings; onSettings: (t: ThemeSettings) => void }) {
  const { user, signOut } = useAuth();
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"));
  const nav = useNavigate();
  const { department } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: departments = [] } = useDepartments();
  const [presentation, setPresentation] = useState(false);
  const [navOpen, setNavOpen] = useState(true);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const isAdmin = user?.role === "ADMIN";
  const date = params.get("date") ?? todayKey();
  const visible = departments.filter((d) => d.isActive && (isAdmin || d.id === user?.departmentId));
  const showNav = !presentation && navOpen;

  const togglePresentation = () => {
    if (!presentation) document.documentElement.requestFullscreen?.().catch(() => undefined);
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    setPresentation(!presentation);
  };
  const group = (title: string, sub: string) => (
    <Box sx={{ px: 3, pt: 2.5, pb: 1 }}><Typography variant="subtitle2" color="primary" fontWeight={700}>{title}</Typography><Typography variant="caption" color="text.secondary">{sub}</Typography></Box>
  );
  const link = (to: string, label: string, icon: React.ReactNode) => (
    <ListItemButton component={NavLink} to={to} onClick={() => !desktop && setNavOpen(false)}
      sx={{ mx: 1.5, my: 0.25, borderRadius: 2, "&.active": { bgcolor: "action.selected", fontWeight: 700 } }}>
      <ListItemIcon sx={{ minWidth: 38, color: "text.secondary" }}>{icon}</ListItemIcon><ListItemText primary={label} slotProps={{ primary: { fontSize: 14, fontWeight: 500 } }} />
    </ListItemButton>
  );
  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.paper" }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 3, height: 72 }}>
        <Avatar variant="rounded" sx={{ bgcolor: "primary.main", width: 34, height: 34 }}><BoltIcon /></Avatar>
        <Box><Typography fontWeight={800} lineHeight={1.1}>DAILY</Typography><Typography variant="caption" color="text.secondary">Status & Operations</Typography></Box>
      </Stack>
      {group("Dashboards", "สรุปรายวันของแต่ละแผนก")}
      <List disablePadding>{visible.map((d) => <Box key={d.id}>{link(`/dashboard/${d.code}?date=${date}`, d.name, <SpaceDashboardIcon />)}</Box>)}</List>
      {isAdmin && <>{group("Administration", "ผู้ใช้และแผนก")}<List disablePadding>{link("/admin/users", "ผู้ใช้", <PeopleIcon />)}{link("/admin/departments", "แผนก", <BusinessIcon />)}</List></>}
      {group("Settings", "การแสดงผล")}
      <List disablePadding>{link("/settings/theme", "ธีม", <PaletteIcon />)}</List>
      <Box sx={{ flex: 1 }} /><Divider />
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
        <Avatar sx={{ bgcolor: "primary.main" }}>{user?.displayName.slice(0, 1)}</Avatar>
        <Box sx={{ minWidth: 0 }}><Typography fontWeight={700} noWrap>{user?.displayName}</Typography><Typography variant="caption" color="text.secondary">{user?.role} · {user?.username}</Typography></Box>
      </Stack>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer variant={desktop ? "persistent" : "temporary"} open={showNav || (!desktop && navOpen && !presentation)} onClose={() => setNavOpen(false)}
        sx={{ width: desktop && showNav ? WIDTH : 0, flexShrink: 0, "& .MuiDrawer-paper": { width: WIDTH, borderRight: 1, borderColor: "divider" } }}>{drawer}</Drawer>
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ bgcolor: "background.default", borderBottom: 1, borderColor: "divider" }}>
          <Toolbar sx={{ gap: 1 }}>
            {!presentation && <IconButton onClick={() => setNavOpen(!navOpen)} sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}><MenuOpenIcon sx={{ transform: navOpen ? "none" : "scaleX(-1)" }} /></IconButton>}
            <Box sx={{ flex: 1 }} />
            {isAdmin && department && (
              <Select size="small" value={department} onChange={(e) => nav(`/dashboard/${e.target.value}?date=${date}`)} sx={{ bgcolor: "background.paper" }}>
                {visible.map((d) => <MenuItem key={d.id} value={d.code}>{d.name}</MenuItem>)}
              </Select>
            )}
            {department && <TextField size="small" type="date" value={date} sx={{ bgcolor: "background.paper", borderRadius: 999 }} onChange={(e) => { const next = new URLSearchParams(params); next.set("date", e.target.value || todayKey()); setParams(next); }} />}
            <Tooltip title="โหมดนำเสนอ (เต็มจอ)"><IconButton onClick={togglePresentation}>{presentation ? <FullscreenExitIcon /> : <FullscreenIcon />}</IconButton></Tooltip>
            <Tooltip title="สลับโหมดสว่าง/มืด"><IconButton onClick={() => onSettings({ ...settings, mode: settings.mode === "dark" ? "light" : "dark" })}>{settings.mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}</IconButton></Tooltip>
            <IconButton onClick={(e) => setMenu(e.currentTarget)}><Avatar sx={{ width: 34, height: 34, bgcolor: "primary.main" }}>{user?.displayName.slice(0, 1)}</Avatar></IconButton>
            <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
              <MenuItem disabled>{user?.displayName} ({user?.role})</MenuItem>
              <MenuItem onClick={() => { signOut(); nav("/login"); }}>ออกจากระบบ</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, md: 4 }, flex: 1, width: "100%", maxWidth: presentation ? "none" : 1440, mx: "auto" }}><Outlet /></Box>
      </Box>
    </Box>
  );
}
