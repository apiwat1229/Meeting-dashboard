CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  code VARCHAR(30) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO departments (code, name, description, sort_order)
VALUES ('IT', 'IT', 'Information Technology', 1);

CREATE TABLE dashboard_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  display_name VARCHAR(120) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'USER',
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT dashboard_users_role_value CHECK (role IN ('ADMIN', 'USER'))
);

CREATE INDEX dashboard_users_department_idx ON dashboard_users (department_id, is_active);

ALTER TABLE projects ADD COLUMN department_id INTEGER;
ALTER TABLE project_tasks ADD COLUMN department_id INTEGER;
ALTER TABLE project_change_history ADD COLUMN department_id INTEGER;
ALTER TABLE activities ADD COLUMN department_id INTEGER;
ALTER TABLE issues ADD COLUMN department_id INTEGER;
ALTER TABLE network_service_statuses ADD COLUMN department_id INTEGER;
ALTER TABLE dashboard_settings ADD COLUMN department_id INTEGER;
ALTER TABLE dashboard_report_days ADD COLUMN department_id INTEGER;

UPDATE projects SET department_id = (SELECT id FROM departments WHERE code = 'IT');
UPDATE project_tasks SET department_id = (SELECT id FROM departments WHERE code = 'IT');
UPDATE project_change_history SET department_id = (SELECT id FROM departments WHERE code = 'IT');
UPDATE activities SET department_id = (SELECT id FROM departments WHERE code = 'IT');
UPDATE issues SET department_id = (SELECT id FROM departments WHERE code = 'IT');
UPDATE network_service_statuses SET department_id = (SELECT id FROM departments WHERE code = 'IT');
UPDATE dashboard_settings SET department_id = (SELECT id FROM departments WHERE code = 'IT');
UPDATE dashboard_report_days SET department_id = (SELECT id FROM departments WHERE code = 'IT');

ALTER TABLE projects ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE project_tasks ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE project_change_history ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE activities ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE issues ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE network_service_statuses ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE dashboard_settings ALTER COLUMN department_id SET NOT NULL;
ALTER TABLE dashboard_report_days ALTER COLUMN department_id SET NOT NULL;

ALTER TABLE projects ADD CONSTRAINT projects_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE project_change_history ADD CONSTRAINT project_change_history_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE activities ADD CONSTRAINT activities_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE issues ADD CONSTRAINT issues_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE network_service_statuses ADD CONSTRAINT network_service_statuses_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE dashboard_settings ADD CONSTRAINT dashboard_settings_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;
ALTER TABLE dashboard_report_days ADD CONSTRAINT dashboard_report_days_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT;

-- Settings IDs were previously just dates. Prefix them to keep one row per department and day.
UPDATE dashboard_settings
SET id = department_id::text || ':' || report_date::text;

ALTER TABLE dashboard_report_days DROP CONSTRAINT dashboard_report_days_pkey;
ALTER TABLE dashboard_report_days ADD CONSTRAINT dashboard_report_days_pkey PRIMARY KEY (department_id, report_date);

ALTER TABLE network_service_statuses DROP CONSTRAINT IF EXISTS network_service_statuses_report_key_unique;
ALTER TABLE network_service_statuses ADD CONSTRAINT network_service_statuses_department_report_key_unique
  UNIQUE (department_id, report_date, service_key);

DROP INDEX IF EXISTS projects_report_order_idx;
DROP INDEX IF EXISTS project_tasks_report_order_idx;
DROP INDEX IF EXISTS project_change_history_project_changed_idx;
DROP INDEX IF EXISTS activities_report_order_idx;
DROP INDEX IF EXISTS issues_report_order_idx;
DROP INDEX IF EXISTS network_service_statuses_report_idx;

CREATE INDEX projects_report_order_idx ON projects (department_id, report_date, sort_order, id);
CREATE INDEX project_tasks_report_order_idx ON project_tasks (department_id, report_date, project_id, sort_order, id);
CREATE INDEX project_change_history_project_changed_idx ON project_change_history (department_id, report_date, project_id, changed_at DESC, id DESC);
CREATE INDEX activities_report_order_idx ON activities (department_id, report_date, section, sort_order, id);
CREATE INDEX issues_report_order_idx ON issues (department_id, report_date, sort_order, id);
CREATE INDEX network_service_statuses_report_idx ON network_service_statuses (department_id, report_date, service_key);

-- Keep project/task/activity relationships inside the same department and report snapshot.
CREATE UNIQUE INDEX projects_department_report_id_key ON projects (department_id, report_date, id);
CREATE UNIQUE INDEX activities_department_report_id_key ON activities (department_id, report_date, id);
CREATE UNIQUE INDEX project_tasks_department_report_id_key ON project_tasks (department_id, report_date, id);
ALTER TABLE project_tasks ADD CONSTRAINT project_tasks_same_department_project_fk
  FOREIGN KEY (department_id, report_date, project_id)
  REFERENCES projects (department_id, report_date, id) ON DELETE CASCADE;
ALTER TABLE project_change_history ADD CONSTRAINT project_history_same_department_project_fk
  FOREIGN KEY (department_id, report_date, project_id)
  REFERENCES projects (department_id, report_date, id) ON DELETE CASCADE;
ALTER TABLE issues ADD CONSTRAINT issues_same_department_project_fk
  FOREIGN KEY (department_id, report_date, project_id)
  REFERENCES projects (department_id, report_date, id) ON DELETE SET NULL (project_id);
ALTER TABLE issues ADD CONSTRAINT issues_same_department_activity_fk
  FOREIGN KEY (department_id, report_date, related_activity_id)
  REFERENCES activities (department_id, report_date, id) ON DELETE SET NULL (related_activity_id);
