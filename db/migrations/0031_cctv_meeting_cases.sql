CREATE TABLE cctv_meeting_cases (
  id VARCHAR(80) PRIMARY KEY,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  title VARCHAR(180) NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  meeting_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cctv_meeting_cases_status_value CHECK (status IN ('READY', 'IN_PROGRESS', 'FOLLOW_UP'))
);

CREATE INDEX cctv_meeting_cases_department_order_idx
  ON cctv_meeting_cases (department_id, sort_order, id);
