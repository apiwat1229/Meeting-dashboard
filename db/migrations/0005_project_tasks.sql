CREATE TYPE project_task_status AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

CREATE TABLE project_tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(220) NOT NULL,
  status project_task_status NOT NULL DEFAULT 'TODO',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX project_tasks_project_sort_idx ON project_tasks (project_id, sort_order, id);
