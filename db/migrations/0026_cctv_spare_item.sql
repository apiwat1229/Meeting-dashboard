ALTER TABLE dashboard_settings
  ALTER COLUMN cctv_recorder_items
  SET DEFAULT '[{"id":"recorder-defective","name":"Status CCTV","quantity":0,"reason":"","media":[]},{"id":"recorder-waiting","name":"Waiting for repair","quantity":0,"reason":"","media":[]},{"id":"recorder-repairing","name":"Repairing CCTV","quantity":0,"reason":"","media":[]},{"id":"recorder-spare","name":"Spare CCTV","quantity":0,"reason":"","media":[]}]'::jsonb;

UPDATE dashboard_settings
SET cctv_recorder_items = cctv_recorder_items || '[{"id":"recorder-spare","name":"Spare CCTV","quantity":0,"reason":"","media":[]}]'::jsonb
WHERE jsonb_typeof(cctv_recorder_items) = 'array'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(cctv_recorder_items) AS items(value)
    WHERE value->>'id' = 'recorder-spare'
       OR lower(value->>'name') = 'spare cctv'
  );
