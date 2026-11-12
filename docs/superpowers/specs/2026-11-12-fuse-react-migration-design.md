# วิเคราะห์ Meeting-dashboard และแผนย้ายเข้า Fuse React

สถานะ: ร่างสำหรับให้ผู้ใช้ review
ขอบเขต: เอกสารวิเคราะห์ + แผนย้าย (ยังไม่แตะโค้ดใน Fuse React)

> **ข้อจำกัด:** โปรเจกต์ปลายทาง `C:\Users\apiwa\Desktop\Web App\fuse-react-react` อยู่บนเครื่อง Windows ของผู้ใช้ session นี้เข้าถึงไม่ได้
> ทุกหัวข้อที่อ้างถึง Fuse React (ส่วนที่ 5-6) จึงเป็น **ข้อสันนิษฐาน** ที่ต้องตรวจกับโปรเจกต์จริงก่อนลงมือ ดูรายการตรวจในส่วนที่ 7

## 1. เป้าหมาย

นำ "ทุกหน้าและทุกการทำงาน" ของ Meeting-dashboard (ชื่อ package `it-dashboard`) ไปออกแบบใหม่และใช้งานบนโครงของ Fuse React
เกณฑ์สำเร็จ:

- ฟีเจอร์เดิมครบทุกข้อในส่วนที่ 3 ใช้งานได้บน Fuse
- ข้อมูลเดิมใน PostgreSQL ใช้ต่อได้ (ไม่ต้อง migrate ข้อมูลทิ้ง)
- สิทธิ์ตามแผนก (ADMIN / USER) และการบังคับเข้าสู่ระบบทำงานเหมือนเดิม
- UI ใช้ layout, navigation และ theme ของ Fuse

## 2. สถาปัตยกรรมปัจจุบัน

| ชั้น | เทคโนโลยี | หมายเหตุ |
|---|---|---|
| Framework | Next.js 16.3.7 (App Router), React 19.2 | AGENTS.md เตือนว่า API ต่างจากที่เคยรู้ ต้องอ่าน `node_modules/next/dist/docs/` |
| UI | Tailwind 4, Base UI, lucide-react | คอมโพเนนต์ใน `src/components/ui/` (dialog, select, combobox, calendar, toast ฯลฯ) |
| Data | Drizzle ORM + `pg` | schema `src/db/schema.ts`, migration SQL 35 ไฟล์ใน `db/migrations/` |
| Mutation | Next.js Server Actions | `src/app/actions.ts` (~1,255 บรรทัด), `auth-actions.ts`, `admin/actions.ts` |
| Auth | Session cookie ที่เซ็นเอง (HttpOnly, 12 ชม.), รหัสผ่าน scrypt | `src/lib/dashboard-auth.ts`, `src/proxy.ts` (middleware) |
| ไฟล์ | อัปโหลดลง volume ผ่าน `/api/images` | จำกัดชนิดไฟล์ + ตรวจ magic bytes |
| งานเบื้องหลัง | scheduler คัดลอกรายงานรายวัน | `instrumentation.ts` -> `daily-reports-scheduler.ts` |
| Deploy | Docker Compose (app + postgres) | volume `dashboard_data`, `dashboard_uploads` |

## 3. แผนที่หน้าและฟีเจอร์

### 3.1 Routes

| Route | หน้าที่ | สิทธิ์ |
|---|---|---|
| `/login` | ล็อกอินผู้ใช้ | สาธารณะ |
| `/admin/login` | ล็อกอินผู้ดูแล | สาธารณะ |
| `/` | redirect ไป dashboard ของแผนกตัวเอง | ล็อกอิน |
| `/dashboard/[department]?date=` | Dashboard รายวัน ถ้าแผนกคือ `CSR-GA` ใช้ `CsrGaDashboard` นอกนั้นใช้ `Dashboard` (IT) | USER เห็นแผนกตัวเองเท่านั้น, ADMIN เลือกได้ทุกแผนก |
| `/admin/users` | จัดการผู้ใช้ | ADMIN |
| `/admin/departments` | จัดการแผนก | ADMIN |
| `/settings/theme` | ตั้งค่า theme | ล็อกอิน |
| `/api/images`, `/api/images/[filename]` | อัปโหลด/เสิร์ฟสื่อ | ล็อกอิน |

### 3.2 ส่วนประกอบของ Dashboard (ใน `src/components/dashboard/`)

| กลุ่มฟีเจอร์ | คอมโพเนนต์ | Server Actions ที่เกี่ยวข้อง |
|---|---|---|
| โครงหน้า, สรุป, เลือกวันที่รายงาน, เต็มจอ, รีเฟรชรายวัน | `dashboard`, `report-date-picker`, `full-screen-toggle`, `daily-refresh` | - |
| Today Focus (โฟกัสวันนี้: กิจกรรม/โปรเจกต์/งานย่อย) | `today-focus` | `saveDashboardFocusAction`, `clearDashboardFocusAction`, `saveDashboardFocusProjectsAction` |
| โปรเจกต์ (สถานะ, progress, กำหนดการ, ประวัติเปลี่ยนแปลง) | `project-crud`, `project-schedule-date`, `project-subtasks` | `create/update/delete ProjectAction`, `updateProjectScheduleAction`, `updateProjectDailyAction`, `getProjectDateHistoryAction` |
| งานย่อยของโปรเจกต์ | `project-subtasks` | `create/update/delete ProjectTaskAction` |
| Issue (ความรุนแรง, สถานะ, next step, prevention, ผูกกับกิจกรรม/โปรเจกต์) | `issue-editor`, `add-issue-menu`, `issue-activity-link-fields` | `create/update/delete IssueAction` |
| Activity (เมื่อวาน/วันนี้, หมวด CSR/GA/SUPPORT/GENERAL, supplier, ภาพก่อน-หลัง, progress) | `activity-crud`, `activity-status-indicator`, `media-file-picker` | `create/update/delete/toggle ActivityAction` |
| สถานะระบบ Network/Server | `system-status` | `saveNetworkServerStatusAction` |
| CCTV (กล้อง, recorder, ประชุม, เคสประชุม, การมองเห็น) | `cctv-operations` | `saveCctvStatusAction`, `saveCctvOperationsAction`, `deleteCctvRecorderItemAction` |
| มุมมอง CSR/GA และแกลเลอรีรูป | `csr-ga-dashboard`, `csr-activity-photos`, `csr-photo-gallery` | ใช้ activity actions ร่วม |
| รายละเอียดแบบ dialog | `detail-dialogs`, `date-picker-field` | - |
| ผู้ใช้/แผนก/auth | `admin/*`, `login-form` | `createDashboardUserAction`, `updateDashboardUserAction`, `createDepartmentAction`, `updateDepartmentStatusAction`, `loginAction`, `logoutAction` |

### 3.3 โมเดลข้อมูล (12 ตาราง)

หลักการสำคัญที่ต้องรักษาไว้ตอนย้าย:

1. **ทุกแถวผูก `department_id`** ตัวกรองแผนกคือขอบเขตสิทธิ์ ห้ามหลุดตอนย้าย
2. **รายงานเป็นรายวัน (`report_date`, เขตเวลา Asia/Bangkok)** ข้อมูลของวันถัดไปเกิดจากการคัดลอก (`dashboard_report_days.copied_from`, `copyReportToNextDay`, `catchUpReportDays`)
3. **โปรเจกต์ใช้ `project_series_id`** เพื่อเชื่อมสำเนารายวันของโปรเจกต์เดียวกัน (มี `project_change_history`)
4. **`media_attachments` มีเจ้าของได้ 1 อย่างเท่านั้น** (CHECK `num_nonnulls = 1`) ได้แก่ issue, activity, network service, dashboard settings หรือ CCTV meeting case
5. **ข้อมูล CCTV บางส่วนเก็บเป็น JSONB** (`cctv_recorder_items`, `cctv_meetings`, `focus_project_ids`, `focus_task_ids`)

ตาราง: `departments`, `dashboard_users`, `network_service_statuses`, `projects`, `project_tasks`, `project_change_history`, `activities`, `issues`, `dashboard_settings`, `cctv_meeting_cases`, `media_attachments`, `dashboard_report_days`

## 4. การตัดสินใจเชิงสถาปัตยกรรม (ข้อเสนอ)

ข้อนี้ขึ้นกับว่า Fuse React ของผู้ใช้เป็นแบบไหน (ส่วนที่ 7 ข้อ 1)

| ทางเลือก | เมื่อไร | ข้อดี | ข้อเสีย |
|---|---|---|---|
| **A. คง backend เดิม, Fuse เป็น front-end (แนะนำ)** | Fuse เป็น Vite/SPA | ย้ายเฉพาะ UI, ตรรกะ DB/สิทธิ์/scheduler ไม่ต้องเขียนใหม่ | ต้องแปลง Server Actions เป็น REST/JSON endpoints |
| B. รวมเป็นโปรเจกต์เดียวบน Next.js | Fuse เป็น Next.js | Server Actions ใช้ต่อได้ | ต้องเทียบเวอร์ชัน Next/React ให้ตรงกัน |
| C. เขียน backend ใหม่ใน Fuse stack | ไม่แนะนำ | - | เสี่ยงข้อมูลและสิทธิ์ผิด ใช้แรงมากสุด |

**ข้อเสนอ:** เลือก A ถ้า Fuse เป็น SPA และเลือก B ถ้าเป็น Next.js
ทั้งสองทางใช้ PostgreSQL + schema เดิมต่อ ไม่แตะข้อมูล

## 5. ออกแบบการวางบน Fuse React (สมมติฐาน)

Fuse React โดยทั่วไปมี layout หลัก (navbar ด้านข้าง + toolbar), ระบบ navigation แบบ config, ธีมผ่าน MUI และโครง route ตามโมดูล

### 5.1 การจับคู่หน้า

| ของเดิม | วางใน Fuse |
|---|---|
| `/login`, `/admin/login` | หน้า sign-in ของ Fuse (รวมเป็นหน้าเดียว แยกบทบาทหลังล็อกอิน) |
| `/dashboard/[department]` | โมดูล `apps/department-dashboard` ใช้ layout มาตรฐานของ Fuse |
| ตัวเลือกแผนกของ ADMIN | dropdown ใน toolbar หรือกลุ่มเมนูใน navbar |
| `/admin/users`, `/admin/departments` | โมดูล `admin` พร้อม guard บทบาท ADMIN (Fuse มี `auth` + role-based nav) |
| `/settings/theme` | ใช้ Settings panel/Theme ของ Fuse แทน (ตัดหน้าเดิมทิ้ง) |

### 5.2 การจับคู่คอมโพเนนต์

| ของเดิม (Base UI + Tailwind) | ใน Fuse (MUI, สมมติฐาน) |
|---|---|
| dialog / alert-dialog | MUI Dialog (Fuse มี dialog provider) |
| select / combobox | MUI Select / Autocomplete |
| calendar / date-picker | MUI X DatePicker (ตั้ง locale ไทย + พ.ศ. ถ้าต้องการ) |
| toast | Fuse `notistack` snackbar |
| card / badge / progress / tooltip | MUI Card / Chip / LinearProgress / Tooltip |
| context-menu | MUI Menu |
| ธีมสี (`theme-default.json`: navy `#112747`, primary `#22558A` ฯลฯ) | ใส่เป็น palette ใน Fuse theme preset |

ฟอนต์ Noto Sans Thai / Sarabun ต้องนำไปตั้งใน Fuse theme ด้วย (ระบบเป็นภาษาไทย)

### 5.3 ฟังก์ชันที่ต้องออกแบบใหม่ตอนย้าย

- **Dashboard 1 วัน = ข้อมูลหลายส่วน:** แยก data hook ต่อส่วน (projects, issues, activities, system status, cctv, focus) เพื่อรีเฟรช/ cache แยกกัน แทนที่จะโหลดทั้งก้อนผ่าน `getDashboardData` เดียว
- **โหมดแสดงบนจอใหญ่ (`maxWidth` 3840, เต็มจอ):** dashboard นี้ใช้แสดงในห้องประชุม ต้องมี layout "presentation" ที่ซ่อน navbar/toolbar ของ Fuse ได้
- **Mutation:** ทุก Server Action ต้องเปลี่ยนเป็น endpoint (ทางเลือก A) หรือคงไว้ (ทางเลือก B) โดยตรวจสิทธิ์ซ้ำฝั่งเซิร์ฟเวอร์เสมอ
- **Auth:** ยุบเป็นระบบเดียว session cookie เดิม (HttpOnly) ทำงานร่วมกับ Fuse auth provider ได้ ไม่ควรเก็บ token ใน localStorage
- **Scheduler รายวัน:** ต้องรันฝั่งเซิร์ฟเวอร์ต่อไป (ทางเลือก A ย้ายไปเป็นโปรเซสแยกหรือ cron ใน container)

## 6. ลำดับการย้าย (เป็นระยะ ปล่อยทีละส่วนได้)

1. **ฐานราก:** ตั้ง DB connection + schema (Drizzle) + migrations ใน backend ที่เลือก, ต่อ auth + guard สิทธิ์แผนก
2. **Shell:** navigation, หน้า sign-in, เลือกแผนก, layout presentation, theme/ฟอนต์
3. **อ่านอย่างเดียวก่อน:** หน้า dashboard แสดงข้อมูลจริงจาก DB (ทุกส่วน) ตรวจเทียบกับระบบเดิม
4. **เขียนข้อมูล:** project/task -> issue -> activity (+ อัปโหลดสื่อ) -> system status/CCTV -> focus
5. **Admin:** users, departments
6. **รายงานรายวัน:** scheduler + คัดลอกวัน + catch-up
7. **Cutover:** ทดสอบคู่ขนานกับระบบเดิม, สำรองฐานข้อมูล (`pg_dump`) ก่อนสลับ

## 7. สิ่งที่ต้องตรวจในโปรเจกต์ Fuse React จริง

1. เป็น **Vite (SPA)** หรือ **Next.js**? เวอร์ชัน React/Next/MUI เท่าไร (Fuse รุ่นใหม่ใช้ React 19 ได้ไหม)
2. ตัวจัดการ state/data (Redux Toolkit, RTK Query, TanStack Query)
3. Auth ปัจจุบัน (JWT mock / Firebase / อื่น ๆ) และจะยุบเข้ากับ session cookie ได้หรือไม่
4. Backend ที่มี (มี mock API/MSW อยู่ไหม) และต้องการให้รันใน Docker เดียวกันหรือแยก
5. ภาษา/locale: ไทยอย่างเดียวหรือหลายภาษา
6. ต้องการเก็บ UI เดิมให้เหมือนที่สุด หรือปรับตามสไตล์ Fuse เต็มที่

## 8. ความเสี่ยง

| ความเสี่ยง | ลดความเสี่ยงโดย |
|---|---|
| สิทธิ์แผนกหลุด (เห็นข้อมูลข้ามแผนก) | ตรวจ `department_id` ฝั่งเซิร์ฟเวอร์ทุก endpoint, มีเทสต์สิทธิ์ |
| ตรรกะรายงานรายวัน/เขตเวลาเพี้ยน | ใช้โค้ด `daily-reports.ts`, `date-key.ts` เดิม ไม่เขียนใหม่ |
| ไฟล์สื่อหาย | ใช้ volume เดิม ไม่ย้ายพาธ |
| งานเยอะ (คอมโพเนนต์ ~6,000 บรรทัด) | ย้ายเป็นระยะตามส่วนที่ 6 และปล่อยทีละส่วน |
| ความไม่เข้ากันของเวอร์ชัน | ตรวจส่วนที่ 7 ข้อ 1 ก่อนเริ่ม |

## 9. ขั้นตอนถัดไป

1. ผู้ใช้ review เอกสารนี้
2. ตอบข้อตรวจในส่วนที่ 7 (หรือเชื่อมโฟลเดอร์ Fuse เข้ามา เพื่อให้ผมตรวจเอง)
3. เมื่ออนุมัติ spec แล้ว จึงเขียน implementation plan (writing-plans) ทีละระยะ
