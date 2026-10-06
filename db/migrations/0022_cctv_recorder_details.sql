ALTER TABLE dashboard_settings
  ALTER COLUMN cctv_recorder_items
  SET DEFAULT '[{"id":"recorder-defective","name":"Defective CCTV","quantity":0,"reason":"","media":[]},{"id":"recorder-waiting","name":"Waiting for repair","quantity":0,"reason":"","media":[]},{"id":"recorder-repairing","name":"Repairing CCTV","quantity":0,"reason":"","media":[]}]'::jsonb;
