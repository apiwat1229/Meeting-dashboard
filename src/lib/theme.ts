import type { CSSProperties } from "react";
import defaultThemeData from "@/lib/theme-default.json";

export type FontFamily = "noto" | "sarabun" | "system" | "serif" | "mono";
export type TypographyRole = "h1" | "h2" | "h3" | "body" | "caption" | "metric";
export type ThemeConfig = {
  colors: {
    canvas: string;
    panel: string;
    panelAlt: string;
    ink: string;
    muted: string;
    border: string;
    navy: string;
    primary: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    infoSoft: string;
  };
  typography: Record<TypographyRole, { family: FontFamily; size: number; weight: string; lineHeight: number }>;
  layout: { radius: number; gap: number; cardPadding: number; maxWidth: number };
};

export const defaultTheme = defaultThemeData as unknown as ThemeConfig;

const fontStacks: Record<FontFamily, string> = {
  noto: '"Noto Sans Thai Variable", "Noto Sans Thai", Tahoma, sans-serif',
  sarabun: '"Sarabun", "Noto Sans Thai Variable", Tahoma, sans-serif',
  system: 'system-ui, "Noto Sans Thai Variable", sans-serif',
  serif: 'Georgia, "Noto Sans Thai Variable", serif',
  mono: 'ui-monospace, "Noto Sans Thai Variable", monospace',
};

export function themeCssVariables(theme: ThemeConfig): CSSProperties {
  const variables: Record<string, string> = {
    "--color-canvas": theme.colors.canvas,
    "--color-panel": theme.colors.panel,
    "--color-panel-alt": theme.colors.panelAlt,
    "--color-ink": theme.colors.ink,
    "--color-muted": theme.colors.muted,
    "--color-border": theme.colors.border,
    "--color-navy": theme.colors.navy,
    "--color-primary": theme.colors.primary,
    "--color-success": theme.colors.success,
    "--color-success-soft": theme.colors.successSoft,
    "--color-warning": theme.colors.warning,
    "--color-warning-soft": theme.colors.warningSoft,
    "--color-danger": theme.colors.danger,
    "--color-danger-soft": theme.colors.dangerSoft,
    "--color-info-soft": theme.colors.infoSoft,
    "--layout-radius": `${theme.layout.radius}px`,
    "--layout-gap": `${theme.layout.gap}px`,
    "--layout-card-padding": `${theme.layout.cardPadding}px`,
    "--layout-max-width": `${theme.layout.maxWidth}px`,
  };

  for (const [name, value] of Object.entries(theme.typography)) {
    variables[`--type-${name}-family`] = fontStacks[value.family];
    variables[`--type-${name}-size`] = `${value.size}px`;
    variables[`--type-${name}-weight`] = value.weight;
    variables[`--type-${name}-line-height`] = String(value.lineHeight);
  }

  return variables as CSSProperties;
}
