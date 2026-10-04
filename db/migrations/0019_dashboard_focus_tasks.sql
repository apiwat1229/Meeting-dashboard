ALTER TABLE dashboard_settings
  ADD COLUMN focus_task_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
