# fuse-dashboard

ออกแบบใหม่ทั้งหมดของ Meeting-dashboard (IT Daily Status & Operations Summary) ด้วย layout แบบ Fuse React:
navbar ด้านข้าง + toolbar + MUI + React Router + TanStack Query รันได้เองโดยไม่ต้องมี backend

```bash
npm install
npm run dev      # http://localhost:5173  (เดโม: admin/admin, csr/csr)
npm run build
```

> โฟลเดอร์นี้สร้างจากการวิเคราะห์โค้ดเดิม ไม่ได้ใช้ซอร์สของ Fuse React จริง (เปิดไม่ได้ในสภาพแวดล้อมที่สร้าง)
> จึงใช้ MUI v6 + โครง layout เดียวกับ Fuse เพื่อให้ย้ายเข้าได้ง่าย

## ฟีเจอร์ที่ย้ายมา (ครบทุกหน้าของระบบเดิม)

| ของเดิม | ไฟล์ใหม่ |
|---|---|
| `/login`, `/admin/login` | `pages/Login.tsx` |
| `/dashboard/[department]` (IT) | `pages/Dashboard.tsx` + `components/*Panel.tsx` |
| `/dashboard/CSR-GA` | `pages/CsrGaDashboard.tsx` (กิจกรรมเป็นหลัก + แกลเลอรี) |
| `/admin/users`, `/admin/departments` | `pages/Admin.tsx` |
| `/settings/theme` | `pages/ThemeSettingsPage.tsx` |
| Today Focus, โปรเจกต์+งานย่อย+ประวัติ, Issue, Activity, Network/Server, CCTV | `components/` |
| สิทธิ์ ADMIN/USER ตามแผนก | `pages/Dashboard.tsx` (กฎเดียวกับ `getAccessibleDepartment`) + `RequireAuth` ใน `App.tsx` |
| รายงานรายวัน + คัดลอกวันถัดไป | `api/store.ts` → `getReport` |
| โหมดจอใหญ่/เต็มจอ | `layout/AppLayout.tsx` (โหมดนำเสนอซ่อน navbar) |

Server Actions ทั้งหมด (~25 ตัว) ถูกลดเหลือ hook เดียว `useReportUpdate` + `FormDialog` ทั่วไป

## ย้ายเข้าโปรเจกต์ Fuse React จริง

1. คัดลอก `src/components`, `src/pages`, `src/api`, `src/types.ts` ไปไว้เป็นโมดูล เช่น `src/app/(control-panel)/daily-status/`
2. ผูก route: `/dashboard/:department` และ `/admin/*` เข้า route config + navigation config ของ Fuse; ลบ `layout/AppLayout.tsx` เพราะใช้ Layout ของ Fuse แทน (เก็บเฉพาะปุ่มโหมดนำเสนอ/เลือกวัน/เลือกแผนกใส่ toolbar ของ Fuse)
3. ใช้ `theme.ts` เป็น palette ใน Fuse theme preset (สีหลัก `#22558A`, navbar `#112747`, ฟอนต์ Noto Sans Thai) และลบหน้า Theme ถ้าใช้ Settings panel ของ Fuse
4. แทน `AuthContext` ด้วย auth ของ Fuse โดยคง role `ADMIN`/`USER` และ `departmentId` ใน user
5. **เชื่อม backend จริง:** แทนที่ `api/store.ts` ด้วยการเรียก REST ตามตารางด้านล่าง ส่วน `hooks.ts` และ UI ไม่ต้องแก้

| ฟังก์ชันใน store | Endpoint ที่ควรมี (เทียบ DB เดิม) |
|---|---|
| `login/logout/currentUser` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` (session cookie HttpOnly) |
| `listDepartments/upsertDepartment` | `GET/POST/PATCH /departments` |
| `listUsers/upsertUser` | `GET/POST/PATCH /users` (hash รหัสผ่านด้วย scrypt ฝั่งเซิร์ฟเวอร์) |
| `getReport(dep, date)` | `GET /departments/:id/reports/:date` (สร้างจากวันก่อนหน้าถ้ายังไม่มี) |
| `saveReport` | `PUT /departments/:id/reports/:date` หรือแยกเป็น `/projects`, `/issues`, `/activities`, `/services`, `/cctv`, `/focus` |
| อัปโหลดรูป | `POST /api/images` (ใช้ของเดิมได้) |

ข้อควรระวัง: ฝั่งเซิร์ฟเวอร์ต้องตรวจ `department_id` ทุก endpoint เหมือนระบบเดิม (ฝั่ง client เป็นเพียง UX)

## สิ่งที่ยังเป็นเดโม

- `api/store.ts` เก็บข้อมูลใน `localStorage` และรหัสผ่านเป็นข้อความธรรมดา **ห้ามใช้จริง**
- ยังไม่มีอัปโหลดรูป (แกลเลอรีแสดงรูปจากข้อมูลที่มีเท่านั้น) และ scheduler รายวัน (จำลองด้วยการคัดลอกวันก่อนหน้าตอนเปิดวันใหม่)
