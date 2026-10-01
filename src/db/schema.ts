import { boolean, check, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ThemeConfig } from "@/lib/theme";

export const projectStatus = pgEnum("project_status", ["ON_TRACK", "ATTENTION", "DELAY"]);
export const issueSeverity = pgEnum("issue_severity", ["HIGH", "MEDIUM", "LOW"]);
export const issueState = pgEnum("issue_state", ["OPEN", "CLOSED"]);
export const activitySection = pgEnum("activity_section", ["YESTERDAY", "TODAY", "OTHER"]);

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 140 }).notNull(),
    status: projectStatus("status").notNull().default("ON_TRACK"),
    yesterday: text("yesterday").notNull().default(""),
    today: text("today").notNull().default(""),
    progress: integer("progress").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("projects_progress_range", sql`${table.progress} between 0 and 100`)],
);

export const issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
    title: varchar("title", { length: 180 }).notNull(),
    severity: issueSeverity("severity").notNull().default("MEDIUM"),
    state: issueState("state").notNull().default("OPEN"),
    detail: text("detail").notNull().default(""),
    nextStep: text("next_step").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  section: activitySection("section").notNull(),
  content: varchar("content", { length: 220 }).notNull(),
  completed: boolean("completed").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const themeSettings = pgTable("theme_settings", {
  id: varchar("id", { length: 40 }).primaryKey(),
  config: jsonb("config").$type<ThemeConfig>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dashboardSettings = pgTable("dashboard_settings", {
  id: varchar("id", { length: 40 }).primaryKey(),
  owner: varchar("owner", { length: 80 }).notNull().default("IT"),
  reportTime: varchar("report_time", { length: 12 }).notNull().default("08:00"),
  purpose: text("purpose").notNull(),
  focusTitle: varchar("focus_title", { length: 140 }).notNull(),
  focusDetail: text("focus_detail").notNull(),
  meetingFlow: text("meeting_flow").notNull(),
  footnote: text("footnote").notNull(),
  cameraCount: integer("camera_count").notNull().default(48),
  recorderStatus: varchar("recorder_status", { length: 40 }).notNull().default("OK"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
