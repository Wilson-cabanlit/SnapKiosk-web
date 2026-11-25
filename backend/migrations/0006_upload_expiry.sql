ALTER TABLE upload_jobs ADD COLUMN upload_token_expires_at TEXT;
CREATE INDEX idx_upload_token_expiry ON upload_jobs(upload_token_expires_at);
