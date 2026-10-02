CREATE TABLE media_attachments (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
  activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT media_attachments_single_owner CHECK ((issue_id IS NULL) <> (activity_id IS NULL))
);

CREATE INDEX media_attachments_issue_id_idx ON media_attachments (issue_id, id);
CREATE INDEX media_attachments_activity_id_idx ON media_attachments (activity_id, id);

INSERT INTO media_attachments (issue_id, url)
SELECT id, image_url FROM issues WHERE image_url <> '';

INSERT INTO media_attachments (activity_id, url)
SELECT id, image_url FROM activities WHERE image_url <> '';

UPDATE issues SET image_url = '' WHERE image_url <> '';
UPDATE activities SET image_url = '' WHERE image_url <> '';
