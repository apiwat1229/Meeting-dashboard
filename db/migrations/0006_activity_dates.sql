ALTER TABLE activities
ADD COLUMN activity_date DATE NOT NULL DEFAULT ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date);

UPDATE activities
SET activity_date = ((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Bangkok')::date) - 1
WHERE section = 'YESTERDAY';

CREATE INDEX activities_section_date_sort_idx ON activities (section, activity_date, sort_order, id);
