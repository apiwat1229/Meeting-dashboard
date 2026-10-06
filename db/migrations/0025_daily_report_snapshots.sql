DO $$
DECLARE
  bangkok_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date;
BEGIN
  ALTER TABLE projects ADD COLUMN report_date DATE;
  ALTER TABLE project_tasks ADD COLUMN report_date DATE;
  ALTER TABLE project_change_history ADD COLUMN report_date DATE;
  ALTER TABLE activities ADD COLUMN report_date DATE;
  ALTER TABLE issues ADD COLUMN report_date DATE;
  ALTER TABLE network_service_statuses ADD COLUMN report_date DATE;
  ALTER TABLE dashboard_settings ADD COLUMN report_date DATE;

  UPDATE projects SET report_date = bangkok_today;
  UPDATE project_tasks SET report_date = bangkok_today;
  UPDATE project_change_history SET report_date = bangkok_today;
  UPDATE activities SET report_date = bangkok_today;
  UPDATE issues SET report_date = bangkok_today;
  UPDATE network_service_statuses SET report_date = bangkok_today;
  UPDATE dashboard_settings SET report_date = bangkok_today;

  ALTER TABLE projects ALTER COLUMN report_date SET NOT NULL;
  ALTER TABLE project_tasks ALTER COLUMN report_date SET NOT NULL;
  ALTER TABLE project_change_history ALTER COLUMN report_date SET NOT NULL;
  ALTER TABLE activities ALTER COLUMN report_date SET NOT NULL;
  ALTER TABLE issues ALTER COLUMN report_date SET NOT NULL;
  ALTER TABLE network_service_statuses ALTER COLUMN report_date SET NOT NULL;
  ALTER TABLE dashboard_settings ALTER COLUMN report_date SET NOT NULL;

  ALTER TABLE network_service_statuses DROP CONSTRAINT IF EXISTS network_service_statuses_service_key_key;
  ALTER TABLE network_service_statuses ADD CONSTRAINT network_service_statuses_report_key_unique UNIQUE (report_date, service_key);
  DROP INDEX IF EXISTS project_change_history_project_changed_idx;
  CREATE INDEX project_change_history_project_changed_idx ON project_change_history (report_date, project_id, changed_at DESC, id DESC);
  CREATE INDEX projects_report_order_idx ON projects (report_date, sort_order, id);
  CREATE INDEX project_tasks_report_order_idx ON project_tasks (report_date, project_id, sort_order, id);
  CREATE INDEX activities_report_order_idx ON activities (report_date, section, sort_order, id);
  CREATE INDEX issues_report_order_idx ON issues (report_date, sort_order, id);
  CREATE INDEX network_service_statuses_report_idx ON network_service_statuses (report_date, service_key);

  ALTER TABLE media_attachments DROP CONSTRAINT IF EXISTS media_attachments_dashboard_settings_id_fkey;
  ALTER TABLE media_attachments
    ADD CONSTRAINT media_attachments_dashboard_settings_id_fkey
    FOREIGN KEY (dashboard_settings_id) REFERENCES dashboard_settings(id)
    ON DELETE CASCADE ON UPDATE CASCADE;

  UPDATE dashboard_settings SET id = report_date::text WHERE id = 'default';

  CREATE TABLE dashboard_report_days (
    report_date DATE PRIMARY KEY,
    copied_from DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  INSERT INTO dashboard_report_days (report_date)
  SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date
  ON CONFLICT (report_date) DO NOTHING;
END $$;
ALTER TABLE projects ALTER COLUMN report_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date);
ALTER TABLE project_tasks ALTER COLUMN report_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date);
ALTER TABLE project_change_history ALTER COLUMN report_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date);
ALTER TABLE activities ALTER COLUMN report_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date);
ALTER TABLE issues ALTER COLUMN report_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date);
ALTER TABLE network_service_statuses ALTER COLUMN report_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date);
ALTER TABLE dashboard_settings ALTER COLUMN report_date SET DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date);

