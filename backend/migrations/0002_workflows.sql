ALTER TABLE events ADD COLUMN booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL;
ALTER TABLE upload_jobs ADD COLUMN upload_token_hash TEXT;
ALTER TABLE upload_jobs ADD COLUMN expected_sha256 TEXT;
ALTER TABLE upload_jobs ADD COLUMN expected_size_bytes INTEGER;
CREATE UNIQUE INDEX idx_upload_token_hash ON upload_jobs(upload_token_hash) WHERE upload_token_hash IS NOT NULL;
CREATE INDEX idx_events_status_start ON events(status,starts_at);
CREATE INDEX idx_device_commands_ack ON device_commands(status,created_at);
CREATE INDEX idx_cleanup_jobs_status ON cleanup_jobs(status,created_at);
