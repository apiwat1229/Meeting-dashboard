import { randomBytes, scryptSync } from "node:crypto";
import pg from "pg";
import { loadLocalEnv } from "./load-local-env.mjs";

const { Client } = pg;
await loadLocalEnv();
const connectionString = process.env.DATABASE_URL;
const password = process.env.INITIAL_ADMIN_PASSWORD;

if (!connectionString) throw new Error("DATABASE_URL is required to create the local administrator.");
if (!password || password.length < 10) throw new Error("Set INITIAL_ADMIN_PASSWORD to a password with at least 10 characters.");

const salt = randomBytes(16).toString("base64url");
const passwordHash = `scrypt$${salt}$${scryptSync(password, salt, 64).toString("base64url")}`;
const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query("BEGIN");
  const department = await client.query("SELECT id FROM departments WHERE code = 'IT' AND is_active = TRUE LIMIT 1");
  if (!department.rowCount) throw new Error("The IT department is missing. Run database migrations first.");
  await client.query(
    `INSERT INTO dashboard_users (username, display_name, password_hash, role, department_id, is_active)
     VALUES ('administrator', 'Administrator', $1, 'ADMIN', $2, TRUE)
     ON CONFLICT (username) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       password_hash = EXCLUDED.password_hash,
       role = 'ADMIN',
       department_id = EXCLUDED.department_id,
       is_active = TRUE,
       updated_at = NOW()`,
    [passwordHash, department.rows[0].id],
  );
  await client.query("COMMIT");
  console.log("Local administrator account is ready.");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
