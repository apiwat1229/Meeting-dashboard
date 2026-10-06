ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activities_progress_range'
      AND conrelid = 'activities'::regclass
  ) THEN
    ALTER TABLE activities
      ADD CONSTRAINT activities_progress_range CHECK (progress BETWEEN 0 AND 100);
  END IF;
END $$;
