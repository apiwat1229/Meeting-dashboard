import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the development database.");
}

const themePath = new URL("../src/lib/theme-default.json", import.meta.url);
const defaultTheme = JSON.parse(await readFile(fileURLToPath(themePath), "utf8"));
const client = new Client({ connectionString });
const dateParts = Object.fromEntries(
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]),
);
const todayDate = `${dateParts.year}-${dateParts.month}-${dateParts.day}`;
const yesterdayDate = new Date(
  Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day) - 1),
).toISOString().slice(0, 10);

try {
  await client.connect();
  await client.query("BEGIN");

  const projectCount = await client.query("SELECT COUNT(*)::int AS count FROM projects");
  if (projectCount.rows[0].count === 0) {
    const inserted = await client.query(
      `INSERT INTO projects (name, status, yesterday, today, progress, sort_order)
       VALUES
        ('PC Renewal 2027', 'ON_TRACK', 'Vendor check', 'Investment form', 78, 1),
        ('Website', 'ON_TRACK', 'Page design', 'User test', 55, 2),
        ('HR System', 'DELAY', 'Login error found', 'Fix & test', 38, 3),
        ('CCTV Upgrade', 'ON_TRACK', 'Camera layout', 'Continue', 70, 4)
       RETURNING id, name`,
    );
    const ids = Object.fromEntries(inserted.rows.map((row) => [row.name, row.id]));

    await client.query(
      `INSERT INTO issues (project_id, title, severity, state, detail, next_step, sort_order)
       VALUES
        ($1, 'HR System login error', 'HIGH', 'OPEN', 'Some users cannot sign in to the HR system.', 'Fix today / Test by 15:00', 1),
        ($2, 'Warehouse Wi-Fi weak', 'MEDIUM', 'OPEN', 'Signal drops in the warehouse area.', 'Check AP settings / Monitor', 2),
        ($2, 'Website UAT delay risk', 'MEDIUM', 'OPEN', 'Department review has not been completed.', 'Waiting for department review', 3),
        (NULL, 'Printer error ACC', 'MEDIUM', 'CLOSED', 'Accounting printer issue has been resolved.', 'Resolved / Skip explanation', 4)`,
      [ids["HR System"], ids.Website],
    );

    await client.query(
      `INSERT INTO activities (section, content, completed, sort_order, activity_date)
       VALUES
        ('YESTERDAY', 'User interview: HR', TRUE, 1, $1::date),
        ('YESTERDAY', 'PC setup ×2', TRUE, 2, $1::date),
        ('YESTERDAY', 'Network issue resolved', TRUE, 3, $1::date),
        ('TODAY', 'Vendor meeting 10:00', FALSE, 1, $2::date),
        ('TODAY', 'PC setup ×3', FALSE, 2, $2::date),
        ('TODAY', 'Warehouse Wi-Fi check', FALSE, 3, $2::date),
        ('OTHER', 'Antivirus quotation received', FALSE, 1, $2::date),
        ('OTHER', 'Server maintenance: 3 Oct', FALSE, 2, $2::date),
        ('OTHER', 'M365 license review started', FALSE, 3, $2::date)`,
      [yesterdayDate, todayDate],
    );
  }

  await client.query(
    `INSERT INTO theme_settings (id, config)
     VALUES ('default', $1::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(defaultTheme)],
  );

  await client.query(
    `INSERT INTO dashboard_settings
       (id, owner, report_time, purpose, focus_title, focus_detail, meeting_flow, footnote, camera_count, recorder_status)
     VALUES
       ('default', 'IT', '08:00',
        'Align on summary, risks, and details only when needed.',
        'HR System', 'Fix login error  |  Test by 15:00',
        'Overall status → Red / yellow items → Today’s focus → Detail sheet only if requested',
        'Dashboard stays shared during the meeting to reduce screen switching and Excel sheet navigation.',
        48, 'OK')
     ON CONFLICT (id) DO NOTHING`,
  );

  await client.query("COMMIT");
  console.log("Development dashboard data is ready.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
