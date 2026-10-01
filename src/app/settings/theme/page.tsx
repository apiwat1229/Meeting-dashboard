import Link from "next/link";
import { ArrowLeft, Palette } from "lucide-react";
import { ThemeSettingsForm } from "@/components/theme/theme-settings-form";
import { getThemeConfig } from "@/lib/data";

export default async function ThemeSettingsPage() {
  const theme = await getThemeConfig();

  return (
    <main className="page-shell settings-shell">
      <div className="settings-topline">
        <Link href="/" className="back-link"><ArrowLeft size={17} /> Dashboard</Link>
        <span className="settings-section-label"><Palette size={16} /> DESIGN SYSTEM</span>
      </div>
      <div className="settings-intro">
        <div>
          <p className="eyebrow type-caption">GLOBAL APPEARANCE</p>
          <h1 className="type-h1">Theme settings</h1>
          <p className="settings-lead type-body">Set the shared colors, typography, and layout scale used across the whole dashboard.</p>
        </div>
        <div className="theme-scope-pill"><span /> Shared theme · all pages</div>
      </div>
      <ThemeSettingsForm initialTheme={theme} />
    </main>
  );
}
