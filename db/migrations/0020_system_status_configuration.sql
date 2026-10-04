ALTER TABLE dashboard_settings
  ADD COLUMN camera_fault_reason TEXT NOT NULL DEFAULT '';

ALTER TABLE media_attachments
  ADD COLUMN dashboard_settings_id VARCHAR(40) REFERENCES dashboard_settings(id) ON DELETE CASCADE;

ALTER TABLE media_attachments
  DROP CONSTRAINT media_attachments_single_owner,
  ADD CONSTRAINT media_attachments_single_owner CHECK (
    num_nonnulls(issue_id, activity_id, network_service_id, dashboard_settings_id) = 1
  );

CREATE INDEX media_attachments_dashboard_settings_id_idx
  ON media_attachments (dashboard_settings_id, id);

UPDATE network_service_statuses
SET service_key = 'file-share', label = 'File Share'
WHERE service_key = 'shared-drive';

UPDATE network_service_statuses SET label = 'Payroll' WHERE service_key = 'payroll';
UPDATE network_service_statuses SET label = 'BCP BackUp' WHERE service_key = 'backup-system';
UPDATE network_service_statuses SET label = 'Log Tracking' WHERE service_key = 'log-tracking';
UPDATE network_service_statuses SET label = 'Solar cell Dashboard' WHERE service_key = 'solar-dashboard';

INSERT INTO network_service_statuses (service_key, label)
VALUES ('file-share', 'File Share')
ON CONFLICT (service_key) DO NOTHING;
