"use client";

import { useActionState, useEffect, useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { saveThemeAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { applyThemeToDocument, defaultTheme, fontFamilyOptions } from "@/lib/theme";
import type { ThemeConfig, TypographyRole } from "@/lib/theme";

const colorLabels: Record<keyof ThemeConfig["colors"], string> = {
  canvas: "Page background",
  panel: "Card surface",
  panelAlt: "Alternate surface",
  ink: "Main text",
  muted: "Secondary text",
  border: "Borders",
  navy: "Header background",
  primary: "Primary action",
  success: "Success status",
  successSoft: "Success surface",
  warning: "Warning status",
  warningSoft: "Warning surface",
  danger: "Critical status",
  dangerSoft: "Critical surface",
  infoSoft: "Information surface",
};

const roleLabels: Record<TypographyRole, { title: string; sample: string; description: string }> = {
  h1: { title: "Header 1 · Page title", sample: "IT Dashboard Sample", description: "ชื่อหน้าและหัวข้อหลักของระบบ" },
  h2: { title: "Header 2 · Section title", sample: "Development / Project Progress", description: "หัวข้อส่วนหลักบนหน้า" },
  h3: { title: "Subheading · Header 3", sample: "New project", description: "หัวข้อย่อยและหัวข้อในการ์ด" },
  body: { title: "Body · เนื้อหา", sample: "Vendor check · User test", description: "ข้อความและข้อมูลหลัก" },
  caption: { title: "Caption · คำอธิบาย", sample: "Yesterday → Today", description: "คำอธิบายประกอบและ label" },
  metric: { title: "Metric · ค่าสรุป", sample: "Action needed", description: "ตัวเลขและสถานะสรุป" },
};

const initialActionState = { ok: false, message: "" };

export function ThemeSettingsForm({ initialTheme }: { initialTheme: ThemeConfig }) {
  const [theme, setTheme] = useState(initialTheme);
  const [state, formAction, pending] = useActionState(saveThemeAction, initialActionState);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  function updateColor(key: keyof ThemeConfig["colors"], value: string) {
    setTheme((current) => ({ ...current, colors: { ...current.colors, [key]: value } }));
  }

  function updateTypography<K extends TypographyRole>(
    role: K,
    key: keyof ThemeConfig["typography"][K],
    value: string | number,
  ) {
    setTheme((current) => ({
      ...current,
      typography: {
        ...current.typography,
        [role]: { ...current.typography[role], [key]: value },
      },
    }));
  }

  function updateLayout(key: keyof ThemeConfig["layout"], value: number) {
    setTheme((current) => ({ ...current, layout: { ...current.layout, [key]: value } }));
  }

  function resetTheme() {
    setTheme(defaultTheme);
  }

  return (
    <form action={formAction} className="theme-settings-form">
      <input type="hidden" name="theme" value={JSON.stringify(theme)} />

      <div className="settings-columns">
        <div className="settings-main-column">
          <Card className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-card-icon palette-icon"><span /></div>
              <div>
                <h2 className="type-h2">Color palette</h2>
                <p className="type-caption">One palette controls the background, cards, text, and status colors everywhere.</p>
              </div>
            </div>
            <div className="color-grid">
              {(Object.keys(colorLabels) as (keyof ThemeConfig["colors"])[]).map((key) => (
                <label className="color-control" key={key}>
                  <span className="color-swatch" style={{ backgroundColor: theme.colors[key] }}>
                    <input aria-label={colorLabels[key]} type="color" value={theme.colors[key]} onChange={(event) => updateColor(key, event.target.value)} />
                  </span>
                  <span className="color-control-copy">
                    <span className="type-body">{colorLabels[key]}</span>
                    <code className="type-caption">{theme.colors[key].toUpperCase()}</code>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card className="settings-card typography-card">
            <div className="settings-card-heading">
              <div className="settings-card-icon type-icon">Aa</div>
              <div>
                <h2 className="type-h2">Typography scale</h2>
                <p className="type-caption">Edit each text role separately. Changes preview immediately and apply across the app after saving.</p>
              </div>
            </div>
            <div className="type-role-list">
              {(Object.keys(roleLabels) as TypographyRole[]).map((role) => (
                <section className="type-role" key={role}>
                  <div className="type-role-preview">
                    <strong className={`type-${role}`}>{roleLabels[role].sample}</strong>
                    <span className="type-caption">{roleLabels[role].title} · {roleLabels[role].description}</span>
                  </div>
                  <div className="type-role-fields">
                    <label className="field-label">Font family
                      <select value={theme.typography[role].family} onChange={(event) => updateTypography(role, "family", event.target.value as ThemeConfig["typography"][typeof role]["family"])}>
                        {fontFamilyOptions.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
                      </select>
                    </label>
                    <label className="field-label">Size · px
                      <input type="number" min="10" max="64" value={theme.typography[role].size} onChange={(event) => updateTypography(role, "size", Number(event.target.value))} />
                    </label>
                    <label className="field-label">Weight
                      <select value={theme.typography[role].weight} onChange={(event) => updateTypography(role, "weight", event.target.value as ThemeConfig["typography"][typeof role]["weight"])}>
                        <option value="400">Regular · 400</option>
                        <option value="500">Medium · 500</option>
                        <option value="600">Semibold · 600</option>
                        <option value="700">Bold · 700</option>
                      </select>
                    </label>
                    <label className="field-label">Line height
                      <input type="number" min="1" max="2" step="0.05" value={theme.typography[role].lineHeight} onChange={(event) => updateTypography(role, "lineHeight", Number(event.target.value))} />
                    </label>
                  </div>
                </section>
              ))}
            </div>
          </Card>

          <Card className="settings-card">
            <div className="settings-card-heading">
              <div className="settings-card-icon layout-icon"><span /><span /><span /></div>
              <div>
                <h2 className="type-h2">Layout scale</h2>
                <p className="type-caption">Keep spacing and proportions consistent across cards and sections.</p>
              </div>
            </div>
            <div className="layout-controls">
              <label className="field-label">Card corner radius · px<input type="number" min="6" max="28" value={theme.layout.radius} onChange={(event) => updateLayout("radius", Number(event.target.value))} /></label>
              <label className="field-label">Section gap · px<input type="number" min="8" max="40" value={theme.layout.gap} onChange={(event) => updateLayout("gap", Number(event.target.value))} /></label>
              <label className="field-label">Card padding · px<input type="number" min="12" max="36" value={theme.layout.cardPadding} onChange={(event) => updateLayout("cardPadding", Number(event.target.value))} /></label>
              <label className="field-label">Maximum page width · px<input type="number" min="1080" max="1920" step="20" value={theme.layout.maxWidth} onChange={(event) => updateLayout("maxWidth", Number(event.target.value))} /></label>
            </div>
          </Card>
        </div>

        <aside className="settings-preview-column">
          <Card className="preview-card">
            <div className="preview-header">
              <span className="type-caption">LIVE PREVIEW</span>
              <span className="preview-live-dot" />
            </div>
            <div className="preview-page-title">
              <p className="eyebrow type-caption">OPERATIONS · DAILY BRIEFING</p>
              <h1 className="type-h1">IT Dashboard</h1>
            </div>
            <div className="preview-panel">
              <h2 className="type-h2">Project Progress</h2>
              <p className="type-caption">Yesterday → Today · Updates shared with the team</p>
              <div className="preview-stat-row">
                <span className="preview-dot" />
                <strong className="type-metric">Normal</strong>
                <span className="preview-chip">In Progress</span>
              </div>
              <h3 className="type-h3">HR System</h3>
              <p className="type-body">Fix login error and test the sign-in flow before 15:00.</p>
            </div>
            <div className="preview-footer type-caption">Colors · typography · spacing</div>
          </Card>
          <div className="type-standard-note">
            <span className="standard-check">✓</span>
            <div>
              <strong className="type-body">Single source of truth</strong>
              <p className="type-caption">Every page uses these shared tokens from the root theme.</p>
            </div>
          </div>
        </aside>
      </div>

      <div className="settings-savebar">
        <div aria-live="polite" className={state.ok ? "save-message save-success" : "save-message"}>
          {state.message || "Unsaved edits preview on this page. Save to apply them across the project."}
        </div>
        <div className="save-actions">
          <Button type="button" variant="secondary" onClick={resetTheme}><RotateCcw size={16} /> Reset defaults</Button>
          <Button type="submit" disabled={pending}><Save size={16} /> {pending ? "Saving…" : "Save shared theme"}</Button>
        </div>
      </div>
    </form>
  );
}
