ALTER TABLE dashboard_settings
  ADD COLUMN focus_activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL;
