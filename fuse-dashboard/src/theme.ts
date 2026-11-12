import { createTheme } from "@mui/material/styles";
import type { ThemeSettings } from "@/types";

export function buildTheme(s: ThemeSettings) {
  const dark = s.mode === "dark";
  const shadow = dark ? "0 1px 2px rgba(0,0,0,.4)" : "0 1px 3px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)";
  return createTheme({
    palette: {
      mode: s.mode, primary: { main: s.primary }, success: { main: "#16A34A" }, warning: { main: "#F59E0B" }, error: { main: "#EF4444" }, info: { main: "#0EA5E9" },
      background: dark ? { default: "#0b1220", paper: "#111a2e" } : { default: "#F1F5F9", paper: "#FFFFFF" },
      text: dark ? undefined : { primary: "#0F172A", secondary: "#64748B" },
      divider: dark ? "rgba(255,255,255,.1)" : "#E2E8F0",
    },
    shape: { borderRadius: s.radius },
    typography: {
      fontFamily: '"Inter Variable","Noto Sans Thai Variable","Noto Sans Thai",system-ui,sans-serif',
      h4: { fontWeight: 800, letterSpacing: -0.5 }, h5: { fontWeight: 800, letterSpacing: -0.3 }, h6: { fontWeight: 700, fontSize: "1.05rem" }, subtitle2: { fontWeight: 600 },
    },
    components: {
      MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { boxShadow: shadow, border: 0, borderRadius: s.radius + 6 } } },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { textTransform: "none", fontWeight: 600, borderRadius: 999 } } },
      MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
      MuiTab: { styleOverrides: { root: { textTransform: "none", fontWeight: 600, minHeight: 36, borderRadius: 999, minWidth: 0, padding: "6px 16px" } } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 999, backgroundColor: "transparent" } } },
    },
  });
}
