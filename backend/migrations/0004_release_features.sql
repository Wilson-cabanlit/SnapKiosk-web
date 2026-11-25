ALTER TABLE storage_connections ADD COLUMN refresh_token_ciphertext TEXT;
ALTER TABLE storage_connections ADD COLUMN access_token_ciphertext TEXT;
ALTER TABLE storage_connections ADD COLUMN access_token_expires_at TEXT;

CREATE TABLE oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_oauth_states_expiration ON oauth_states(expires_at);

CREATE TABLE data_deletion_requests (
  id TEXT PRIMARY KEY,
  requested_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('account','event','studio')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  reason TEXT,
  reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_deletion_requests_status ON data_deletion_requests(status,created_at);

CREATE TRIGGER prevent_overlapping_client_bookings
BEFORE INSERT ON bookings
WHEN NEW.status IN ('reserved','confirmed') AND EXISTS (
  SELECT 1 FROM bookings b WHERE b.client_id=NEW.client_id
    AND b.status IN ('reserved','confirmed')
    AND NEW.starts_at < b.ends_at AND NEW.ends_at > b.starts_at
)
BEGIN
  SELECT RAISE(ABORT,'booking overlaps an existing reservation');
END;

CREATE TRIGGER prevent_overlapping_client_bookings_update
BEFORE UPDATE OF client_id,starts_at,ends_at,status ON bookings
WHEN NEW.status IN ('reserved','confirmed') AND EXISTS (
  SELECT 1 FROM bookings b WHERE b.client_id=NEW.client_id AND b.id!=OLD.id
    AND b.status IN ('reserved','confirmed')
    AND NEW.starts_at < b.ends_at AND NEW.ends_at > b.starts_at
)
BEGIN
  SELECT RAISE(ABORT,'booking overlaps an existing reservation');
END;
