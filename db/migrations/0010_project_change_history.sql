CREATE TABLE project_change_history (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  field VARCHAR(40) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX project_change_history_project_changed_idx
  ON project_change_history (project_id, changed_at DESC, id DESC);
