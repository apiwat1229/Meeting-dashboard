ALTER TABLE projects ADD COLUMN project_series_id UUID;

WITH project_series AS (
  SELECT
    department_id,
    created_at,
    sort_order,
    gen_random_uuid() AS project_series_id
  FROM projects
  GROUP BY department_id, created_at, sort_order
)
UPDATE projects AS project
SET project_series_id = project_series.project_series_id
FROM project_series
WHERE project.department_id = project_series.department_id
  AND project.created_at = project_series.created_at
  AND project.sort_order = project_series.sort_order;

ALTER TABLE projects ALTER COLUMN project_series_id SET DEFAULT gen_random_uuid();
ALTER TABLE projects ALTER COLUMN project_series_id SET NOT NULL;

CREATE INDEX projects_series_report_idx
  ON projects (department_id, project_series_id, report_date);
