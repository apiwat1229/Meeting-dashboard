ALTER TABLE dashboard_settings
  ADD COLUMN cctv_recorder_items JSONB NOT NULL
    DEFAULT '["Defective CCTV", "Waiting for repair", "Repairing CCTV", "Install New CCTV"]'::jsonb,
  ADD COLUMN cctv_meetings JSONB NOT NULL
    DEFAULT '[{"id":"cctv-meeting-2026-10-08","date":"2026-10-08","startTime":"13:00","endTime":"15:00","members":""}]'::jsonb,
  ADD CONSTRAINT dashboard_settings_cctv_recorder_items_array
    CHECK (jsonb_typeof(cctv_recorder_items) = 'array'),
  ADD CONSTRAINT dashboard_settings_cctv_meetings_array
    CHECK (jsonb_typeof(cctv_meetings) = 'array');
