CREATE TYPE project_status AS ENUM ('ON_TRACK', 'ATTENTION', 'DELAY');
CREATE TYPE issue_severity AS ENUM ('HIGH', 'MEDIUM', 'LOW');
CREATE TYPE issue_state AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE activity_section AS ENUM ('YESTERDAY', 'TODAY', 'OTHER');

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(140) NOT NULL,
  status project_status NOT NULL DEFAULT 'ON_TRACK',
  yesterday TEXT NOT NULL DEFAULT '',
  today TEXT NOT NULL DEFAULT '',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE issues (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
  title VARCHAR(180) NOT NULL,
  severity issue_severity NOT NULL DEFAULT 'MEDIUM',
  state issue_state NOT NULL DEFAULT 'OPEN',
  detail TEXT NOT NULL DEFAULT '',
  next_step TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activities (
  id SERIAL PRIMARY KEY,
  section activity_section NOT NULL,
  content VARCHAR(220) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE theme_settings (
  id VARCHAR(40) PRIMARY KEY,
  config JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dashboard_settings (
  id VARCHAR(40) PRIMARY KEY,
  owner VARCHAR(80) NOT NULL DEFAULT 'IT',
  report_time VARCHAR(12) NOT NULL DEFAULT '08:00',
  purpose TEXT NOT NULL,
  focus_title VARCHAR(140) NOT NULL,
  focus_detail TEXT NOT NULL,
  meeting_flow TEXT NOT NULL,
  footnote TEXT NOT NULL,
  camera_count INTEGER NOT NULL DEFAULT 48,
  recorder_status VARCHAR(40) NOT NULL DEFAULT 'OK',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX issues_state_sort_order_idx ON issues (state, sort_order, created_at);
CREATE INDEX activities_section_sort_order_idx ON activities (section, sort_order, id);
