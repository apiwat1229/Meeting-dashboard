import { useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { useAuth } from "@/auth/AuthContext";
import { getTheme, setTheme } from "@/api/store";
import { buildTheme } from "@/theme";
import { AppLayout } from "@/layout/AppLayout";
import { Login } from "@/pages/Login";
import { Dashboard, DepartmentHome } from "@/pages/Dashboard";
import { AdminDepartments, AdminUsers } from "@/pages/Admin";
import { ThemeSettingsPage } from "@/pages/ThemeSettingsPage";
import type { ReactNode } from "react";

function RequireAuth({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}

export function App() {
  const [settings, setSettings] = useState(getTheme());
  const theme = useMemo(() => buildTheme(settings), [settings]);
  const change = (t: typeof settings) => { setTheme(t); setSettings(t); };
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth><AppLayout settings={settings} onSettings={change} /></RequireAuth>}>
            <Route index element={<DepartmentHome />} />
            <Route path="dashboard/:department" element={<Dashboard />} />
            <Route path="admin/users" element={<RequireAuth admin><AdminUsers /></RequireAuth>} />
            <Route path="admin/departments" element={<RequireAuth admin><AdminDepartments /></RequireAuth>} />
            <Route path="settings/theme" element={<ThemeSettingsPage theme={settings} onChange={change} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
