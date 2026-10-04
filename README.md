# IT Dashboard

Dashboard สำหรับสรุปสถานะโปรเจกต์ ประเด็นเร่งด่วน และกิจกรรมของทีม โดยใช้ Next.js, TypeScript, Tailwind CSS, PostgreSQL และ Drizzle ORM พร้อม Theme กลางที่บันทึกในฐานข้อมูล

## เริ่มพัฒนาในเครื่อง

ต้องมี Docker Desktop และ Docker Compose

```powershell
docker compose -f compose.dev.yaml up --build
```

เปิด `http://localhost:3000` ข้อมูลตัวอย่างจะถูกสร้างให้อัตโนมัติในฐานข้อมูลพัฒนา PostgreSQL เก็บข้อมูลใน named volume และเปิดให้เครื่องนี้เชื่อมต่อผ่าน `127.0.0.1:5437` สำหรับกรณีรัน Next.js ด้วย `npm run dev` นอก Docker

หยุด container ด้วย `Ctrl+C` แล้วสั่ง `docker compose -f compose.dev.yaml down` ได้ ข้อมูลฐานข้อมูลยังอยู่ใน volume เดิม หากต้องการลบฐานข้อมูลพัฒนาทิ้งทั้งหมด ให้ใช้ `docker compose -f compose.dev.yaml down -v`

## เตรียม deploy บน Docker Server

1. คัดลอก `.env.production.example` เป็น `.env.production` แล้วตั้งรหัสผ่าน PostgreSQL ที่เดายาก โดยให้ค่าใน `DATABASE_URL` ตรงกับ `POSTGRES_USER`, `POSTGRES_PASSWORD` และ `POSTGRES_DB` ตั้ง `DASHBOARD_USERNAME`, `DASHBOARD_PASSWORD` และ `DASHBOARD_SESSION_SECRET` ด้วย โดยรหัส Dashboard ต้องแยกจากรหัสเซิร์ฟเวอร์ และ session secret ควรสุ่มอย่างน้อย 32 ตัวอักษร
2. ส่ง source code ไปยัง Docker Server แล้วรัน:

```sh
docker compose --env-file .env.production up -d --build
```

Compose จะ build production image, รอ PostgreSQL พร้อมใช้งาน, ใช้ migration ที่ยังไม่เคยรัน และเริ่ม Next.js จาก standalone build ข้อมูลจริงอยู่ใน volume `dashboard_data`; การสร้าง image ใหม่ไม่ลบฐานข้อมูล

ให้เก็บ `.env.production` ไว้นอก Git และตั้ง reverse proxy/TLS ตามโครงสร้างเซิร์ฟเวอร์ของคุณ ตัวอย่าง backup ฐานข้อมูลจาก PowerShell:

```powershell
docker compose --env-file .env.production exec -T db pg_dump -U it_dashboard -d it_dashboard > backup.sql
```

ระบบจะบังคับเข้าสู่ระบบก่อนดู Dashboard และตรวจสิทธิ์ซ้ำใน Server Actions และ Route Handlers ด้วย Session cookie มีอายุ 12 ชั่วโมง และใช้ `HttpOnly`, `SameSite=Lax` และ `Secure` เมื่อเปิดผ่าน HTTPS หากตั้ง `DASHBOARD_COOKIE_SECURE=false` จะอนุญาตคุกกี้ผ่าน HTTP ซึ่งควรใช้เฉพาะ staging ที่จำกัดอยู่บน loopback เท่านั้น

## โครงสร้างโปรเจกต์

```text
src/
  app/                       Routes, root layout, server actions
    settings/theme/          หน้าตั้งค่า Theme กลาง
  components/
    dashboard/               การ์ดสรุป ตาราง และกิจกรรม
    theme/                   ฟอร์มตั้งค่าและ preview Theme
    ui/                      ปุ่ม การ์ด Badge และ Progress ที่ใช้ร่วมกัน
  db/                        Drizzle schema และ connection pool
  lib/                       data access, validation และ design tokens
db/migrations/               SQL migrations ที่เพิ่มตามลำดับ
scripts/                     รัน migrations และ seed ข้อมูลพัฒนา
Dockerfile                   Development และ production image
compose.dev.yaml              สภาพแวดล้อมพัฒนาพร้อม hot reload
compose.yaml                  สภาพแวดล้อม production สำหรับ server
```

## Theme และมาตรฐาน UI

เปิด **Theme settings** ที่มุมบนของ Dashboard เพื่อปรับสีหลัก, สีพื้นหลังและสถานะ, font family, ขนาด, น้ำหนัก, line height และค่าระยะห่างได้จากจุดเดียว ระบบ preview ก่อนบันทึก และเก็บ Theme กลางไว้ใน `theme_settings` เพื่อให้ทุกหน้าใช้ค่าเดียวกัน

บทบาทตัวอักษรแยกกันเป็น Header 1, Header 2, หัวข้อย่อย/Header 3, เนื้อหา, Caption และค่าตัวเลขสรุป แต่ละบทบาทกำหนด font family, size, weight และ line height แยกได้ ฟอนต์ Noto Sans Thai และ Sarabun รวมอยู่ใน bundle จึงไม่ต้องโหลดฟอนต์จากอินเทอร์เน็ต

ค่าตั้งต้นและ validation อยู่ใน `src/lib/theme-default.json` และ `src/lib/theme.ts` ส่วน global CSS variables ถูกสร้างจาก config แล้วผูกที่ root layout ทุก component จึงควรใช้ class บทบาท เช่น `type-h1`, `type-h2`, `type-h3`, `type-body`, `type-caption` และ `type-metric` แทนการกำหนดขนาดตัวอักษรเฉพาะจุด

## ฐานข้อมูลและการเพิ่ม migration

เพิ่มไฟล์ SQL ใหม่ใน `db/migrations/` โดยใช้เลขลำดับถัดไป เช่น `0002_add_team_members.sql` แล้วเริ่มแอปใหม่ ตัว migration runner จะบันทึกชื่อไฟล์ที่รันแล้วใน `app_migrations` จึงไม่รันซ้ำ

ในโหมดพัฒนา ใช้ `npm run db:setup` หลัง PostgreSQL พร้อม เพื่อรัน migration และเพิ่มข้อมูลตัวอย่าง เฉพาะโหมดพัฒนาเท่านั้นที่ seed ข้อมูลตัวอย่างอัตโนมัติ
