import { useState } from "react";
import { Outlet, NavLink, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppBar, Avatar, Box, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Menu, MenuItem, Select, TextField, Toolbar, Tooltip, Typography } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import BusinessIcon from "@mui/icons-material/Business";
import PaletteIcon from "@mui/icons-material/Palette";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "@/auth/AuthContext";
import { useDepartments } from "@/api/hooks";
import { todayKey } from "@/api/store";

const WIDTH = 260;

/** Fuse-style shell: left navbar + top toolbar + content; "presentation mode" hides both for meeting-room screens. */
export function AppLayout({ navy }: { navy: string }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const { department } = useParams();
  const [params, setParams] = useSearchParams();
  const { data: departments = [] } = useDepartments();
  const [presentation, setPresentation] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menu, setMenu] = useState<HTMLElement | null>(null);
  const isAdmin = user?.role === "ADMIN";
  const date = params.get("date") ?? todayKey();
  const visible = departments.filter((d) => d.isActive && (isAdmin || d.id === user?.departmentId));

  const togglePresentation = () => {
    if (!presentation) document.documentElement.requestFullscreen?.().catch(() => undefined);
    else if (document.fullscreenElement) document.exitFullscreen?.().catch(() => undefined);
    setPresentation(!presentation);
  };
  const link = (to: string, label: string, icon: React.ReactNode) => (
    <ListItemButton component={NavLink} to={to} onClick={() => setMobileOpen(false)} sx={{ color: "inherit", "&.active": { bgcolor: "rgba(255,255,255,.14)" } }}>
      <ListItemIcon sx={{ color: "inherit", minWidth: 40 }}>{icon}</ListItemIcon><ListItemText primary={label} />
    </ListItemButton>
  );
  const drawer = (
    <Box sx={{ bgcolor: navy, color: "#fff", height: "100%" }}>
      <Toolbar><Typography variant="h6">Daily Status</Typography></Toolbar>
      <List subheader={<ListSubheader sx={{ bgcolor: "transparent", color: "rgba(255,255,255,.6)" }}>Dashboard</ListSubheader>}>
        {visible.map((d) => <Box key={d.id}>{link(`/dashboard/${d.code}?date=${date}`, d.name, <DashboardIcon />)}</Box>)}
      </List>
      {isAdmin && <><Divider sx={{ borderColor: "rgba(255,255,255,.15)" }} />
        <List subheader={<ListSubheader sx={{ bgcolor: "transparent", color: "rgba(255,255,255,.6)" }}>Administration</ListSubheader>}>
          {link("/admin/users", "ผู้ใช้", <PeopleIcon />)}{link("/admin/departments", "แผนก", <BusinessIcon />)}
        </List></>}
      <Divider sx={{ borderColor: "rgba(255,255,255,.15)" }} />
      <List>{link("/settings/theme", "ธีม", <PaletteIcon />)}</List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {!presentation && <>
        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ display: { md: "none" }, "& .MuiDrawer-paper": { width: WIDTH, border: 0 } }}>{drawer}</Drawer>
        <Drawer variant="permanent" sx={{ display: { xs: "none", md: "block" }, width: WIDTH, "& .MuiDrawer-paper": { width: WIDTH, border: 0 } }} open>{drawer}</Drawer>
      </>}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Toolbar sx={{ gap: 1 }}>
            {!presentation && <IconButton sx={{ display: { md: "none" } }} onClick={() => setMobileOpen(true)}><MenuIcon /></IconButton>}
            <Typography variant="h6" sx={{ flex: 1 }} noWrap>Daily Status & Operations Summary</Typography>
            {isAdmin && department && (
              <Select size="small" value={department} onChange={(e) => nav(`/dashboard/${e.target.value}?date=${date}`)}>
                {visible.map((d) => <MenuItem key={d.id} value={d.code}>{d.name}</MenuItem>)}
              </Select>
            )}
            {department && <TextField size="small" type="date" value={date} onChange={(e) => { const next = new URLSearchParams(params); next.set("date", e.target.value || todayKey()); setParams(next); }} />}
            <Tooltip title="โหมดนำเสนอ"><IconButton onClick={togglePresentation}>{presentation ? <FullscreenExitIcon /> : <FullscreenIcon />}</IconButton></Tooltip>
            <IconButton onClick={(e) => setMenu(e.currentTarget)}><Avatar sx={{ width: 32, height: 32 }}>{user?.displayName.slice(0, 1)}</Avatar></IconButton>
            <Menu anchorEl={menu} open={!!menu} onClose={() => setMenu(null)}>
              <MenuItem disabled>{user?.displayName} ({user?.role})</MenuItem>
              <MenuItem onClick={() => { signOut(); nav("/login"); }}>ออกจากระบบ</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, md: 3 }, flex: 1 }}><Outlet /></Box>
      </Box>
    </Box>
  );
}
