-- Optional explanation entered when a project's start or end date is rescheduled.
ALTER TABLE project_change_history ADD COLUMN reason TEXT NOT NULL DEFAULT '';
