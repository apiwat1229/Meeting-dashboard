ALTER TABLE activities
  ADD COLUMN before_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN before_reason TEXT NOT NULL DEFAULT '',
  ADD COLUMN after_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN after_reason TEXT NOT NULL DEFAULT '';

ALTER TABLE media_attachments
  ADD COLUMN activity_phase VARCHAR(16) NOT NULL DEFAULT 'GENERAL',
  ADD CONSTRAINT media_attachments_activity_phase_value
    CHECK (activity_phase IN ('GENERAL', 'BEFORE', 'AFTER')),
  ADD CONSTRAINT media_attachments_activity_phase_owner
    CHECK (activity_phase = 'GENERAL' OR activity_id IS NOT NULL);
