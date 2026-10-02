ALTER TABLE issues
  ADD COLUMN related_activity_id INTEGER REFERENCES activities(id) ON DELETE SET NULL;

CREATE INDEX issues_related_activity_id_idx ON issues (related_activity_id);
