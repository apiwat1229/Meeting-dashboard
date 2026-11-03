import pg from "pg";
import { loadLocalEnv } from "./load-local-env.mjs";

const { Client } = pg;
await loadLocalEnv();
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the development database.");
}

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
  const departmentResult = await client.query("SELECT id FROM departments WHERE code = 'IT' LIMIT 1");
  if (!departmentResult.rowCount) throw new Error("The IT department must exist before seeding dashboard data.");
  const departmentId = departmentResult.rows[0].id;

  const projectCount = await client.query("SELECT COUNT(*)::int AS count FROM projects");
  if (projectCount.rows[0].count === 0) {
    const inserted = await client.query(
      `INSERT INTO projects (department_id, name, status, yesterday, today, progress, sort_order)
       VALUES
        ($1, 'PC Renewal 2027', 'ON_TRACK', 'Vendor check', 'Investment form', 78, 1),
        ($1, 'Website', 'ON_TRACK', 'Page design', 'User test', 55, 2),
        ($1, 'HR System', 'DELAY', 'Login error found', 'Fix & test', 38, 3),
        ($1, 'CCTV Upgrade', 'ON_TRACK', 'Camera layout', 'Continue', 70, 4)
       RETURNING id, name`,
      [departmentId],
    );
    const ids = Object.fromEntries(inserted.rows.map((row) => [row.name, row.id]));

    await client.query(
      `INSERT INTO issues (department_id, project_id, title, severity, state, detail, next_step, sort_order)
       VALUES
        ($1, $2, 'HR System login error', 'HIGH', 'OPEN', 'Some users cannot sign in to the HR system.', 'Fix today / Test by 15:00', 1),
        ($1, $3, 'Warehouse Wi-Fi weak', 'MEDIUM', 'OPEN', 'Signal drops in the warehouse area.', 'Check AP settings / Monitor', 2),
        ($1, $3, 'Website UAT delay risk', 'MEDIUM', 'OPEN', 'Department review has not been completed.', 'Waiting for department review', 3),
        ($1, NULL, 'Printer error ACC', 'MEDIUM', 'CLOSED', 'Accounting printer issue has been resolved.', 'Resolved / Skip explanation', 4)`,
      [departmentId, ids["HR System"], ids.Website],
    );

    await client.query(
      `INSERT INTO activities (department_id, section, content, completed, sort_order, activity_date)
       VALUES
        ($1, 'YESTERDAY', 'User interview: HR', TRUE, 1, $2::date),
        ($1, 'YESTERDAY', 'PC setup ×2', TRUE, 2, $2::date),
        ($1, 'YESTERDAY', 'Network issue resolved', TRUE, 3, $2::date),
        ($1, 'TODAY', 'Vendor meeting 10:00', FALSE, 1, $3::date),
        ($1, 'TODAY', 'PC setup ×3', FALSE, 2, $3::date),
        ($1, 'TODAY', 'Warehouse Wi-Fi check', FALSE, 3, $3::date),
        ($1, 'TODAY', 'Antivirus quotation received', FALSE, 4, $3::date),
        ($1, 'TODAY', 'Server maintenance: 3 Oct', FALSE, 5, $3::date),
        ($1, 'TODAY', 'M365 license review started', FALSE, 6, $3::date)`,
      [departmentId, yesterdayDate, todayDate],
    );
  }

  await client.query(
    `INSERT INTO dashboard_settings
       (id, department_id, owner, report_time, purpose, focus_title, focus_detail, meeting_flow, footnote, camera_count, recorder_status)
     VALUES
       ($1, $2, 'IT', '08:00',
        'Align on summary, risks, and details only when needed.',
        'HR System', 'Fix login error  |  Test by 15:00',
        'Overall status → Red / yellow items → Today’s focus → Detail sheet only if requested',
        'Dashboard stays shared during the meeting to reduce screen switching and Excel sheet navigation.',
        135, 'OK')
     ON CONFLICT (id) DO NOTHING`,
    [`${departmentId}:${todayDate}`, departmentId],
  );

  await client.query("COMMIT");
  console.log("Development dashboard data is ready.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
