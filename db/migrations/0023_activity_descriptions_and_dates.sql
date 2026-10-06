ALTER TABLE activities
  ADD COLUMN description TEXT NOT NULL DEFAULT '',
  ADD COLUMN start_date DATE,
  ADD COLUMN finish_date DATE;

UPDATE activities
SET start_date = activity_date
WHERE start_date IS NULL;
