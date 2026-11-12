// Types mirror the original PostgreSQL schema (src/db/schema.ts of Meeting-dashboard).
export type ProjectStatus = "ON_TRACK" | "ATTENTION" | "DELAY" | "FINISH";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Severity = "HIGH" | "MEDIUM" | "LOW";
export type ActivitySection = "YESTERDAY" | "TODAY";
export type ActivityCategory = "CSR" | "GA" | "SUPPORT" | "GENERAL";
export type ServiceState = "UNKNOWN" | "NORMAL" | "ABNORMAL";
export type CaseStatus = "READY" | "IN_PROGRESS" | "FOLLOW_UP";
export type Role = "ADMIN" | "USER";

export interface Department { id: number; code: string; name: string; description: string; isActive: boolean; sortOrder: number }
export interface DashboardUser { id: number; username: string; displayName: string; password: string; role: Role; departmentId: number; isActive: boolean }

export interface Task { id: number; title: string; status: TaskStatus; startDate?: string; endDate?: string }
export interface Project {
  id: number; seriesId: string; name: string; status: ProjectStatus; yesterday: string; today: string;
  startDate?: string; endDate?: string; progress: number; tasks: Task[];
  history: { at: string; field: string; oldValue: string; newValue: string }[];
}
export interface Issue {
  id: number; title: string; severity: Severity; state: "OPEN" | "CLOSED"; detail: string; nextStep: string;
  prevention: string; projectId?: number; activityId?: number; images: string[];
}
export interface Activity {
  id: number; section: ActivitySection; category: ActivityCategory; content: string; description: string;
  severity: "HIGH" | "MEDIUM"; completed: boolean; progress: number; startDate?: string; finishDate?: string;
  supplierRequired: boolean; supplierName: string; supplierContact: string; supplierPhone: string;
  beforeReason: string; afterReason: string; images: { url: string; phase: "GENERAL" | "BEFORE" | "AFTER" }[];
}
export interface ServiceStatus { id: number; label: string; status: ServiceState; reason: string }
export interface CctvItem { id: string; name: string; quantity: number; reason: string }
export interface CctvMeeting { id: string; date: string; startTime: string; endTime: string; note: string }
export interface CctvCase { id: string; title: string; detail: string; meetingDate?: string; status: CaseStatus }
export interface Cctv {
  cameraCount: number; faulty: number; faultReason: string; waitingRepair: number; repairing: number; installing: number;
  recorderStatus: string; recorderItems: CctvItem[]; meetings: CctvMeeting[]; cases: CctvCase[]; meetingVisible: boolean;
}
export interface Focus { title: string; detail: string; projectIds: number[]; taskIds: number[]; activityId?: number }

/** One department + one day (= dashboard_settings + all rows with the same report_date). */
export interface Report {
  departmentId: number; reportDate: string; owner: string; reportTime: string; purpose: string; meetingFlow: string; footnote: string;
  focus: Focus; projects: Project[]; issues: Issue[]; activities: Activity[]; services: ServiceStatus[]; cctv: Cctv;
  copiedFrom?: string;
}

export interface ThemeSettings { mode: "light" | "dark"; primary: string; navy: string; radius: number }
export interface Session { userId: number }
