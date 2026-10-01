import { z } from "zod";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Enter a six-digit hex color.");

const typographyRoleSchema = z.object({
  family: z.enum(["noto", "sarabun", "system", "serif", "mono"]),
  size: z.number().min(10).max(64),
  weight: z.enum(["400", "500", "600", "700"]),
  lineHeight: z.number().min(1).max(2),
});

export const themeConfigSchema = z.object({
  colors: z.object({
    canvas: hexColor,
    panel: hexColor,
    panelAlt: hexColor,
    ink: hexColor,
    muted: hexColor,
    border: hexColor,
    navy: hexColor,
    primary: hexColor,
    success: hexColor,
    successSoft: hexColor,
    warning: hexColor,
    warningSoft: hexColor,
    danger: hexColor,
    dangerSoft: hexColor,
    infoSoft: hexColor,
  }),
  typography: z.object({
    h1: typographyRoleSchema,
    h2: typographyRoleSchema,
    h3: typographyRoleSchema,
    body: typographyRoleSchema,
    caption: typographyRoleSchema,
    metric: typographyRoleSchema,
  }),
  layout: z.object({
    radius: z.number().min(6).max(28),
    gap: z.number().min(8).max(40),
    cardPadding: z.number().min(12).max(36),
    maxWidth: z.number().min(1080).max(1920),
  }),
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;
export type TypographyRole = keyof ThemeConfig["typography"];
export type FontFamily = ThemeConfig["typography"]["h1"]["family"];
