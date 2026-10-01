ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'FINISH';

UPDATE projects
SET status = 'ON_TRACK', updated_at = NOW()
WHERE status = 'ATTENTION';
