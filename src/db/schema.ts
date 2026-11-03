import { boolean, check, date, index, integer, jsonb, pgEnum, pgTable, primaryKey, serial, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { CctvMeeting, CctvMeetingCaseStatus, CctvRecorderItem } from "@/lib/cctv-operations";

export const projectStatus = pgEnum("project_status", ["ON_TRACK", "ATTENTION", "DELAY", "FINISH"]);
export const projectTaskStatus = pgEnum("project_task_status", ["TODO", "IN_PROGRESS", "DONE"]);
export const issueSeverity = pgEnum("issue_severity", ["HIGH", "MEDIUM", "LOW"]);
export const issueState = pgEnum("issue_state", ["OPEN", "CLOSED"]);
export const activitySeverity = pgEnum("activity_severity", ["HIGH", "MEDIUM"]);
// Keep OTHER for existing PostgreSQL enums; dashboard data normalizes it into TODAY.
export const activitySection = pgEnum("activity_section", ["YESTERDAY", "TODAY", "OTHER"]);
export const activityCategory = pgEnum("activity_category", ["CSR", "GA", "SUPPORT", "GENERAL"]);
export const departments = pgTable("departments", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 30 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dashboardUsers = pgTable("dashboard_users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 60 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 16 }).notNull().default("USER"),
  departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("dashboard_users_role_value", sql`${table.role} in ('ADMIN', 'USER')`), index("dashboard_users_department_idx").on(table.departmentId, table.isActive)]);

export const networkServiceStatuses = pgTable(
  "network_service_statuses",
  {
    id: serial("id").primaryKey(),
    departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
    serviceKey: varchar("service_key", { length: 40 }).notNull(),
    reportDate: date("report_date", { mode: "string" }).notNull().default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date`),
    label: varchar("label", { length: 80 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("UNKNOWN"),
    reason: varchar("reason", { length: 240 }).notNull().default(""),
    detail: text("detail").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("network_service_status_value", sql`${table.status} in ('UNKNOWN', 'NORMAL', 'ABNORMAL')`),
    index("network_service_statuses_report_idx").on(table.departmentId, table.reportDate, table.serviceKey),
  ],
);

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),
    projectSeriesId: uuid("project_series_id").notNull().defaultRandom(),
    departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
    reportDate: date("report_date", { mode: "string" }).notNull().default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date`),
    name: varchar("name", { length: 140 }).notNull(),
    status: projectStatus("status").notNull().default("ON_TRACK"),
    yesterday: text("yesterday").notNull().default(""),
    today: text("today").notNull().default(""),
    startDate: date("start_date", { mode: "string" }),
    endDate: date("end_date", { mode: "string" }),
    progress: integer("progress").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("projects_progress_range", sql`${table.progress} between 0 and 100`),
    index("projects_series_report_idx").on(table.departmentId, table.projectSeriesId, table.reportDate),
  ],
);

export const projectTasks = pgTable("project_tasks", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
  reportDate: date("report_date", { mode: "string" }).notNull().default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date`),
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 220 }).notNull(),
  status: projectTaskStatus("status").notNull().default("TODO"),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectChangeHistory = pgTable(
  "project_change_history",
  {
    id: serial("id").primaryKey(),
    departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
    reportDate: date("report_date", { mode: "string" }).notNull().default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date`),
    projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    field: varchar("field", { length: 40 }).notNull(),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("project_change_history_project_changed_idx").on(table.departmentId, table.reportDate, table.projectId, table.changedAt.desc(), table.id.desc())],
);

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
  reportDate: date("report_date", { mode: "string" }).notNull().default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date`),
  section: activitySection("section").notNull(),
    category: activityCategory("category").notNull().default("GENERAL"),
  content: varchar("content", { length: 220 }).notNull(),
  description: text("description").notNull().default(""),
  severity: activitySeverity("severity").notNull().default("MEDIUM"),
  imageUrl: text("image_url").notNull().default(""),
  completed: boolean("completed").notNull().default(false),
  progress: integer("progress").notNull().default(0),
  activityDate: date("activity_date", { mode: "string" }).notNull().defaultNow(),
  startDate: date("start_date", { mode: "string" }),
  finishDate: date("finish_date", { mode: "string" }),
  supplierRequired: boolean("supplier_required").notNull().default(false),
  supplierName: varchar("supplier_name", { length: 180 }),
  supplierContact: varchar("supplier_contact", { length: 180 }),
  supplierPhone: varchar("supplier_phone", { length: 80 }),
  supplierDetails: text("supplier_details"),
  beforeEnabled: boolean("before_enabled").notNull().default(false),
  beforeReason: text("before_reason").notNull().default(""),
  afterEnabled: boolean("after_enabled").notNull().default(false),
  afterReason: text("after_reason").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [check("activities_progress_range", sql`${table.progress} between 0 and 100`)]);

export const issues = pgTable(
  "issues",
  {
    id: serial("id").primaryKey(),
    departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
    reportDate: date("report_date", { mode: "string" }).notNull().default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date`),
    projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
    relatedSection: activitySection("related_section"),
    relatedActivityId: integer("related_activity_id").references(() => activities.id, { onDelete: "set null" }),
    title: varchar("title", { length: 180 }).notNull(),
    severity: issueSeverity("severity").notNull().default("MEDIUM"),
    state: issueState("state").notNull().default("OPEN"),
    detail: text("detail").notNull().default(""),
    nextStep: text("next_step").notNull().default(""),
    prevention: text("prevention").notNull().default(""),
    imageUrl: text("image_url").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const dashboardSettings = pgTable("dashboard_settings", {
  id: varchar("id", { length: 40 }).primaryKey(),
  departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
  reportDate: date("report_date", { mode: "string" }).notNull().default(sql`(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date`),
  owner: varchar("owner", { length: 80 }).notNull().default("IT"),
  reportTime: varchar("report_time", { length: 12 }).notNull().default("08:00"),
  purpose: text("purpose").notNull(),
  focusTitle: varchar("focus_title", { length: 140 }).notNull(),
  focusDetail: text("focus_detail").notNull(),
  focusActivityId: integer("focus_activity_id").references(() => activities.id, { onDelete: "set null" }),
  focusProjectIds: jsonb("focus_project_ids").$type<number[]>().notNull().default(sql`'[]'::jsonb`),
  focusTaskIds: jsonb("focus_task_ids").$type<number[]>().notNull().default(sql`'[]'::jsonb`),
  meetingFlow: text("meeting_flow").notNull(),
  footnote: text("footnote").notNull(),
  cameraCount: integer("camera_count").notNull().default(135),
  cameraFaultyCount: integer("camera_faulty_count").notNull().default(0),
  cameraFaultReason: text("camera_fault_reason").notNull().default(""),
  cameraWaitingRepairCount: integer("camera_waiting_repair_count").notNull().default(0),
  cameraRepairingCount: integer("camera_repairing_count").notNull().default(0),
  cameraInstallingCount: integer("camera_installing_count").notNull().default(0),
  recorderStatus: varchar("recorder_status", { length: 40 }).notNull().default("OK"),
  cctvRecorderItems: jsonb("cctv_recorder_items").$type<CctvRecorderItem[]>().notNull().default(sql`'[{"id":"recorder-defective","name":"Status CCTV","quantity":0,"reason":"","media":[]},{"id":"recorder-waiting","name":"Waiting for repair","quantity":0,"reason":"","media":[]},{"id":"recorder-repairing","name":"Repairing CCTV","quantity":0,"reason":"","media":[]},{"id":"recorder-spare","name":"Spare CCTV","quantity":0,"reason":"","media":[]}]'::jsonb`),
  cctvMeetings: jsonb("cctv_meetings").$type<CctvMeeting[]>().notNull().default(sql`'[{"id":"cctv-meeting-2026-10-08","date":"2026-10-08","startTime":"13:00","endTime":"15:00","members":""}]'::jsonb`),
  cctvMeetingVisible: boolean("cctv_meeting_visible").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cctvMeetingCases = pgTable("cctv_meeting_cases", {
  id: varchar("id", { length: 80 }).primaryKey(),
  departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  detail: text("detail").notNull().default(""),
  meetingDate: date("meeting_date", { mode: "string" }),
  status: varchar("status", { length: 20 }).$type<CctvMeetingCaseStatus>().notNull().default("IN_PROGRESS"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  check("cctv_meeting_cases_status_value", sql`${table.status} IN ('READY', 'IN_PROGRESS', 'FOLLOW_UP')`),
  index("cctv_meeting_cases_department_order_idx").on(table.departmentId, table.sortOrder, table.id),
]);

export const mediaAttachments = pgTable(
  "media_attachments",
  {
    id: serial("id").primaryKey(),
    issueId: integer("issue_id").references(() => issues.id, { onDelete: "cascade" }),
    activityId: integer("activity_id").references(() => activities.id, { onDelete: "cascade" }),
    networkServiceId: integer("network_service_id").references(() => networkServiceStatuses.id, { onDelete: "cascade" }),
    dashboardSettingsId: varchar("dashboard_settings_id", { length: 40 }).references(() => dashboardSettings.id, { onDelete: "cascade" }),
    cctvMeetingCaseId: varchar("cctv_meeting_case_id", { length: 80 }).references(() => cctvMeetingCases.id, { onDelete: "cascade" }),
    activityPhase: varchar("activity_phase", { length: 16 }).notNull().default("GENERAL"),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("media_attachments_single_owner", sql`num_nonnulls(${table.issueId}, ${table.activityId}, ${table.networkServiceId}, ${table.dashboardSettingsId}, ${table.cctvMeetingCaseId}) = 1`),
    check("media_attachments_activity_phase_value", sql`${table.activityPhase} IN ('GENERAL', 'BEFORE', 'AFTER')`),
    check("media_attachments_activity_phase_owner", sql`${table.activityPhase} = 'GENERAL' OR ${table.activityId} IS NOT NULL`),
    index("media_attachments_issue_id_idx").on(table.issueId, table.id),
    index("media_attachments_activity_id_idx").on(table.activityId, table.id),
    index("media_attachments_network_service_id_idx").on(table.networkServiceId, table.id),
    index("media_attachments_dashboard_settings_id_idx").on(table.dashboardSettingsId, table.id),
    index("media_attachments_cctv_meeting_case_id_idx").on(table.cctvMeetingCaseId, table.id),
  ],
);

export const dashboardReportDays = pgTable("dashboard_report_days", {
  departmentId: integer("department_id").notNull().references(() => departments.id, { onDelete: "restrict" }),
  reportDate: date("report_date", { mode: "string" }).notNull(),
  copiedFrom: date("copied_from", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.departmentId, table.reportDate] })]);
