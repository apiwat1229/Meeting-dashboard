import { createTheme } from "@mui/material/styles";
import type { ThemeSettings } from "@/types";

export function buildTheme(s: ThemeSettings) {
  const dark = s.mode === "dark";
  return createTheme({
    palette: {
      mode: s.mode, primary: { main: s.primary }, success: { main: "#18A96B" }, warning: { main: "#F5AD36" }, error: { main: "#ED5355" },
      background: dark ? { default: "#0d1726", paper: "#14233a" } : { default: "#F3F6FA", paper: "#FFFFFF" },
      text: dark ? undefined : { primary: "#172B49", secondary: "#5E7491" },
    },
    shape: { borderRadius: s.radius },
    typography: { fontFamily: '"Noto Sans Thai Variable","Noto Sans Thai",system-ui,sans-serif', h5: { fontWeight: 700 }, h6: { fontWeight: 700 } },
    components: {
      MuiCard: { defaultProps: { variant: "outlined" } },
      MuiButton: { styleOverrides: { root: { textTransform: "none" } } },
    },
  });
}
export const navyColor = (s: ThemeSettings) => s.navy;
