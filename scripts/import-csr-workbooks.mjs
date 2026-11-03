import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rename, stat } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import pg from "pg";

const { Client } = pg;
const manifestPath = resolve(process.argv[2] || "");
const assetDirectory = resolve(process.argv[3] || "");
const uploadDirectory = resolve(process.env.UPLOAD_DIR || join(process.cwd(), "uploads"));

if (!process.argv[2] || !process.argv[3]) {
  throw new Error("Usage: node scripts/import-csr-workbooks.mjs <manifest.json> <assets-directory>");
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (manifest.version !== 1 || !Array.isArray(manifest.records) || !Array.isArray(manifest.assets)) {
  throw new Error("Unsupported CSR import manifest.");
}
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

await mkdir(uploadDirectory, { recursive: true });
const assets = new Map(manifest.assets.map((asset) => [asset.url, asset]));
let copiedFiles = 0;
let existingFiles = 0;

for (const asset of manifest.assets) {
  const filename = basename(asset.url);
  const destination = join(uploadDirectory, filename);
  try {
    await stat(destination);
    existingFiles += 1;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    const temporary = `${destination}.${process.pid}.tmp`;
    try {
      await copyFile(join(assetDirectory, asset.file), temporary);
      await rename(temporary, destination);
      copiedFiles += 1;
    } catch (copyError) {
      await import("node:fs/promises").then(({ unlink }) => unlink(temporary).catch(() => {}));
      if (copyError?.code === "EEXIST") existingFiles += 1;
      else throw copyError;
    }
  }
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let inserted = 0;
let updated = 0;
let attachmentCount = 0;
let duplicateAttachments = 0;
const warnings = [];

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS csr_source_imports (
      department_id integer NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
      source_key text NOT NULL,
      activity_id integer NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
      source_name text NOT NULL DEFAULT '',
      content_hash text NOT NULL,
      imported_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (department_id, source_key)
    )
  `);

  const departmentResult = await client.query(
    "SELECT id FROM departments WHERE code = $1 AND is_active = true",
    [manifest.departmentCode],
  );
  if (departmentResult.rowCount !== 1) throw new Error(`Active department ${manifest.departmentCode} was not found.`);
  const departmentId = departmentResult.rows[0].id;

  for (let index = 0; index < manifest.records.length; index += 1) {
    const record = manifest.records[index];
    const sourceKeys = [...new Set(record.sourceKeys || [record.sourceKey])].filter(Boolean);
    if (sourceKeys.length === 0) throw new Error(`Record ${index + 1} has no source key.`);
    const body = JSON.stringify(record);
    const contentHash = createHash("sha256").update(body).digest("hex");

    await client.query("BEGIN");
    try {
      const existing = await client.query(
        "SELECT DISTINCT activity_id FROM csr_source_imports WHERE department_id = $1 AND source_key = ANY($2::text[])",
        [departmentId, sourceKeys],
      );
      const existingIds = [...new Set(existing.rows.map((row) => Number(row.activity_id)))];
      if (existingIds.length > 1) throw new Error(`Source keys for ${record.content} point to multiple activities.`);

      const values = [
        departmentId,
        record.reportDate,
        record.section || "TODAY",
        record.category,
        record.content,
        record.description || "",
        Boolean(record.completed),
        Number(record.completed ? 100 : 0),
        record.activityDate || record.reportDate,
        index * 10,
      ];
      let activityId;
      if (existingIds.length === 1) {
        activityId = existingIds[0];
        await client.query(
          `UPDATE activities SET department_id=$1, report_date=$2, section=$3, category=$4,
            content=$5, description=$6, completed=$7, progress=$8, activity_date=$9, sort_order=$10
            WHERE id=$11`,
          [...values, activityId],
        );
        updated += 1;
      } else {
        const result = await client.query(
          `INSERT INTO activities
            (department_id, report_date, section, category, content, description, completed, progress, activity_date, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
          values,
        );
        activityId = result.rows[0].id;
        inserted += 1;
      }

      for (const sourceKey of sourceKeys) {
        await client.query(
          `INSERT INTO csr_source_imports (department_id, source_key, activity_id, source_name, content_hash)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (department_id, source_key) DO UPDATE
             SET activity_id=EXCLUDED.activity_id, source_name=EXCLUDED.source_name,
                 content_hash=EXCLUDED.content_hash, imported_at=now()`,
          [departmentId, sourceKey, activityId, record.sourceName || "CSR-GA workbook", contentHash],
        );
      }

      const mediaUrls = [...new Set((record.images || []).map((image) => image.url))];
      for (const url of mediaUrls) {
        if (!assets.has(url)) throw new Error(`Manifest is missing asset ${url}.`);
        const result = await client.query(
          `INSERT INTO media_attachments (activity_id, activity_phase, url)
           SELECT $1, 'GENERAL', $2
           WHERE NOT EXISTS (SELECT 1 FROM media_attachments WHERE activity_id=$1 AND url=$2)
           RETURNING id`,
          [activityId, url],
        );
        if (result.rowCount) attachmentCount += 1;
        else duplicateAttachments += 1;
      }

      await client.query(
        `INSERT INTO dashboard_report_days (department_id, report_date)
         VALUES ($1, $2) ON CONFLICT (department_id, report_date) DO NOTHING`,
        [departmentId, record.reportDate],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  const summary = await client.query(
    `SELECT count(*)::int AS imported_records,
            count(DISTINCT report_date)::int AS report_days,
            min(report_date)::text AS first_date,
            max(report_date)::text AS last_date
       FROM activities
      WHERE department_id=$1 AND id IN (SELECT activity_id FROM csr_source_imports WHERE department_id=$1)`,
    [departmentId],
  );
  const mediaSummary = await client.query(
    `SELECT count(*)::int AS media_links, count(DISTINCT url)::int AS distinct_files
       FROM media_attachments
      WHERE activity_id IN (SELECT activity_id FROM csr_source_imports WHERE department_id=$1)`,
    [departmentId],
  );

  console.log(JSON.stringify({
    department: manifest.departmentCode,
    manifestRecords: manifest.records.length,
    inserted,
    updated,
    copiedFiles,
    existingFiles,
    attachmentCount,
    duplicateAttachments,
    imported: summary.rows[0],
    media: mediaSummary.rows[0],
    warnings,
  }, null, 2));
} finally {
  await client.end();
}
