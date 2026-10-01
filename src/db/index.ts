import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@/db/schema";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://dashboard:dashboard_dev_only@localhost:5437/it_dashboard_dev";

const globalForDatabase = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForDatabase.pgPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDatabase.pgPool = pool;
}

export const db = drizzle(pool, { schema });
