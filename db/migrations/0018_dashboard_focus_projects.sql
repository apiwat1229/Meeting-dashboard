ALTER TABLE dashboard_settings
  ADD COLUMN focus_project_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
