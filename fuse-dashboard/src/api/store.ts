import type { Cctv, DashboardUser, Department, Report, ThemeSettings } from "@/types";

/**
 * Local mock "backend". Every function below maps 1:1 to an endpoint of the original system, so the
 * module can be replaced by REST calls (see ../../README.md) without touching the UI.
 */
const KEY = "fuse-dashboard-db-v1";
interface DB { departments: Department[]; users: DashboardUser[]; reports: Record<string, Report>; theme: ThemeSettings; nextId: number; sessionUserId: number | null }

export const defaultTheme: ThemeSettings = { mode: "light", primary: "#22558A", navy: "#112747", radius: 10 };
export const todayKey = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());

const emptyCctv = (): Cctv => ({
  cameraCount: 135, faulty: 0, faultReason: "", waitingRepair: 0, repairing: 0, installing: 0, recorderStatus: "OK",
  recorderItems: [{ id: "recorder-defective", name: "Status CCTV", quantity: 0, reason: "" }], meetings: [], cases: [], meetingVisible: true,
});

function seed(): DB {
  const date = todayKey();
  const report = (departmentId: number, owner: string, purpose: string): Report => ({
    departmentId, reportDate: date, owner, reportTime: "08:00", purpose, meetingFlow: "1. สรุปงานเมื่อวาน  2. แผนงานวันนี้  3. ประเด็นเร่งด่วน",
    footnote: "ข้อมูลอัปเดตรายวัน", focus: { title: "โฟกัสวันนี้", detail: "", projectIds: [1], taskIds: [] },
    projects: [{ id: 1, seriesId: "p1", name: "อัปเกรดเครือข่ายอาคาร A", status: "ON_TRACK", yesterday: "สำรวจหน้างาน", today: "ติดตั้งสวิตช์", startDate: date, endDate: date, progress: 40,
      tasks: [{ id: 1, title: "สั่งซื้ออุปกรณ์", status: "DONE" }, { id: 2, title: "ติดตั้งสวิตช์", status: "IN_PROGRESS" }, { id: 3, title: "ทดสอบระบบ", status: "TODO" }], history: [] }],
    issues: [{ id: 1, title: "WiFi ชั้น 3 ช้า", severity: "MEDIUM", state: "OPEN", detail: "ผู้ใช้แจ้งสัญญาณหลุดบ่อย", nextStep: "ตรวจ AP", prevention: "", images: [] }],
    activities: [
      { id: 1, section: "YESTERDAY", category: "SUPPORT", content: "ซ่อมเครื่องพิมพ์ฝ่ายบัญชี", description: "", severity: "MEDIUM", completed: true, progress: 100, supplierRequired: false, supplierName: "", supplierContact: "", supplierPhone: "", beforeReason: "", afterReason: "", images: [] },
      { id: 2, section: "TODAY", category: "GENERAL", content: "ตรวจสอบ Backup ประจำวัน", description: "", severity: "HIGH", completed: false, progress: 30, supplierRequired: false, supplierName: "", supplierContact: "", supplierPhone: "", beforeReason: "", afterReason: "", images: [] },
    ],
    services: [{ id: 1, label: "Internet", status: "NORMAL", reason: "" }, { id: 2, label: "Server", status: "NORMAL", reason: "" }, { id: 3, label: "VPN", status: "ABNORMAL", reason: "Latency สูง" }],
    cctv: emptyCctv(),
  });
  return {
    nextId: 1000, sessionUserId: null, theme: defaultTheme,
    departments: [
      { id: 1, code: "IT", name: "IT", description: "Information Technology", isActive: true, sortOrder: 1 },
      { id: 2, code: "CSR-GA", name: "CSR / GA", description: "CSR และงานธุรการ", isActive: true, sortOrder: 2 },
    ],
    users: [
      { id: 1, username: "admin", displayName: "ผู้ดูแลระบบ", password: "admin", role: "ADMIN", departmentId: 1, isActive: true },
      { id: 2, username: "csr", displayName: "ทีม CSR", password: "csr", role: "USER", departmentId: 2, isActive: true },
    ],
    reports: { [`1:${date}`]: report(1, "IT", "สรุปสถานะโปรเจกต์และงานเร่งด่วนของทีม IT"), [`2:${date}`]: report(2, "CSR/GA", "สรุปกิจกรรม CSR และงานธุรการ") },
  };
}

let db: DB | null = null;
function load(): DB {
  if (db) return db;
  try { const raw = localStorage.getItem(KEY); if (raw) return (db = JSON.parse(raw) as DB); } catch { /* ignore */ }
  return (db = seed());
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ } }
export const nextId = () => { const d = load(); d.nextId += 1; save(); return d.nextId; };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

// --- auth -----------------------------------------------------------------------------------------
export function login(username: string, password: string): DashboardUser | null {
  const user = load().users.find((u) => u.username === username && u.password === password && u.isActive);
  if (!user) return null;
  load().sessionUserId = user.id; save(); return clone(user);
}
export function logout() { load().sessionUserId = null; save(); }
export function currentUser(): DashboardUser | null {
  const d = load(); return clone(d.users.find((u) => u.id === d.sessionUserId && u.isActive) ?? null);
}

// --- departments / users --------------------------------------------------------------------------
export const listDepartments = (): Department[] => clone(load().departments.slice().sort((a, b) => a.sortOrder - b.sortOrder));
export function upsertDepartment(dep: Partial<Department> & { code: string; name: string }) {
  const d = load(); const existing = d.departments.find((x) => x.id === dep.id);
  if (existing) Object.assign(existing, dep);
  else d.departments.push({ id: nextId(), description: "", isActive: true, sortOrder: d.departments.length + 1, ...dep });
  save();
}
export const listUsers = (): DashboardUser[] => clone(load().users);
export function upsertUser(user: Partial<DashboardUser> & { username: string }) {
  const d = load(); const existing = d.users.find((x) => x.id === user.id);
  if (existing) Object.assign(existing, { ...user, password: user.password || existing.password });
  else d.users.push({ id: nextId(), displayName: user.username, password: "", role: "USER", departmentId: 1, isActive: true, ...user });
  save();
}

// --- theme ----------------------------------------------------------------------------------------
export const getTheme = (): ThemeSettings => clone(load().theme);
export function setTheme(theme: ThemeSettings) { load().theme = theme; save(); }

// --- daily reports --------------------------------------------------------------------------------
/** Mirrors ensureReportDate/copyReportToNextDay: a new day is copied from the latest earlier day. */
export function getReport(departmentId: number, reportDate: string): Report {
  const d = load(); const key = `${departmentId}:${reportDate}`;
  if (!d.reports[key]) {
    const earlier = Object.values(d.reports).filter((r) => r.departmentId === departmentId && r.reportDate < reportDate).sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
    if (earlier) {
      const copy = clone(earlier); copy.reportDate = reportDate; copy.copiedFrom = earlier.reportDate;
      // Today's items become yesterday's, finished work is dropped from carry-over.
      copy.activities = copy.activities.map((a) => ({ ...a, section: "YESTERDAY" as const })).filter((a) => !a.completed || a.section === "YESTERDAY");
      d.reports[key] = copy;
    } else {
      const dep = d.departments.find((x) => x.id === departmentId);
      d.reports[key] = { ...clone(Object.values(d.reports)[0] ?? seed().reports[Object.keys(seed().reports)[0]]), departmentId, reportDate, owner: dep?.name ?? "", projects: [], issues: [], activities: [], services: [], cctv: emptyCctv(), focus: { title: "โฟกัสวันนี้", detail: "", projectIds: [], taskIds: [] } };
    }
    save();
  }
  return clone(d.reports[key]);
}
export function saveReport(report: Report) { load().reports[`${report.departmentId}:${report.reportDate}`] = clone(report); save(); }
