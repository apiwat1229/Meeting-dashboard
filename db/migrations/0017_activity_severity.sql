CREATE TYPE activity_severity AS ENUM ('HIGH', 'MEDIUM');

ALTER TABLE activities
  ADD COLUMN severity activity_severity NOT NULL DEFAULT 'MEDIUM';
