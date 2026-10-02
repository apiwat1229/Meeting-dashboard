CREATE TABLE network_service_statuses (
  id SERIAL PRIMARY KEY,
  service_key VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
  reason VARCHAR(240) NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT network_service_status_value CHECK (status IN ('UNKNOWN', 'NORMAL', 'ABNORMAL'))
);

INSERT INTO network_service_statuses (service_key, label) VALUES
  ('internet', 'Internet'),
  ('wifi', 'Wi-Fi'),
  ('shared-drive', 'Shared drive'),
  ('payroll', 'Payroll'),
  ('solar-dashboard', 'Solar dashboard'),
  ('backup-system', 'Backup system'),
  ('log-tracking', 'Log tracking'),
  ('qr-code-system', 'QR Code System');

UPDATE dashboard_settings
SET camera_count = 135
WHERE id = 'default' AND camera_count = 48;

ALTER TABLE dashboard_settings
  ALTER COLUMN camera_count SET DEFAULT 135,
  ADD COLUMN camera_faulty_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN camera_waiting_repair_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN camera_repairing_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN camera_installing_count INTEGER NOT NULL DEFAULT 0,
  ADD CONSTRAINT dashboard_camera_counts_nonnegative CHECK (
    camera_count >= 0
    AND camera_faulty_count >= 0
    AND camera_waiting_repair_count >= 0
    AND camera_repairing_count >= 0
    AND camera_installing_count >= 0
  ),
  ADD CONSTRAINT dashboard_camera_counts_within_total CHECK (
    camera_faulty_count + camera_waiting_repair_count + camera_repairing_count + camera_installing_count <= camera_count
  );

ALTER TABLE media_attachments
  ADD COLUMN network_service_id INTEGER REFERENCES network_service_statuses(id) ON DELETE CASCADE;

ALTER TABLE media_attachments
  DROP CONSTRAINT media_attachments_single_owner,
  ADD CONSTRAINT media_attachments_single_owner CHECK (
    num_nonnulls(issue_id, activity_id, network_service_id) = 1
  );

CREATE INDEX media_attachments_network_service_id_idx ON media_attachments (network_service_id, id);
