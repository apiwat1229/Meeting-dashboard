ALTER TABLE media_attachments
  ADD COLUMN cctv_meeting_case_id VARCHAR(80)
  REFERENCES cctv_meeting_cases(id) ON DELETE CASCADE;

ALTER TABLE media_attachments
  DROP CONSTRAINT media_attachments_single_owner;

ALTER TABLE media_attachments
  ADD CONSTRAINT media_attachments_single_owner
  CHECK (num_nonnulls(issue_id, activity_id, network_service_id, dashboard_settings_id, cctv_meeting_case_id) = 1);

CREATE INDEX media_attachments_cctv_meeting_case_id_idx
  ON media_attachments (cctv_meeting_case_id, id);
