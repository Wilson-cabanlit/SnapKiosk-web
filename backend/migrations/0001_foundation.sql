PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE roles (
  name TEXT PRIMARY KEY CHECK (name IN ('owner','administrator','event_staff')),
  description TEXT NOT NULL
);
INSERT INTO roles(name,description) VALUES
  ('owner','Full studio access and business settings'),
  ('administrator','Manage events, bookings, templates, kiosks, and galleries'),
  ('event_staff','Access assigned events and kiosks only');

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL REFERENCES roles(name),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_seen_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_sessions_expiration ON sessions(expires_at);

CREATE TABLE auth_attempts (
  key_hash TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL,
  blocked_until TEXT
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE rental_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_minor INTEGER NOT NULL DEFAULT 0 CHECK (price_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  duration_minutes INTEGER NOT NULL DEFAULT 240 CHECK (duration_minutes > 0),
  guest_validity_days INTEGER NOT NULL DEFAULT 7 CHECK (guest_validity_days IN (7,15,30)),
  client_validity_days INTEGER NOT NULL DEFAULT 30 CHECK (client_validity_days IN (7,15,30)),
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT,
  os_version TEXT,
  app_version TEXT,
  status TEXT NOT NULL DEFAULT 'enabled' CHECK (status IN ('enabled','disabled','revoked')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  client_id TEXT NOT NULL REFERENCES clients(id),
  package_id TEXT REFERENCES rental_packages(id),
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  amount_minor INTEGER NOT NULL DEFAULT 0 CHECK (amount_minor >= 0),
  status TEXT NOT NULL DEFAULT 'inquiry' CHECK (status IN ('inquiry','reserved','confirmed','completed','cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (ends_at > starts_at)
);
CREATE INDEX idx_bookings_starts_status ON bookings(starts_at,status);

CREATE TABLE booking_payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'PHP',
  method TEXT,
  recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  paid_at TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_booking_payments_booking_date ON booking_payments(booking_id,paid_at);

CREATE TABLE events (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'other',
  client_id TEXT REFERENCES clients(id),
  venue TEXT,
  starts_at TEXT,
  ends_at TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Manila',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','active','completed','cancelled','archived')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE event_devices (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id),
  assigned_from TEXT NOT NULL,
  assigned_until TEXT NOT NULL,
  PRIMARY KEY (event_id,device_id,assigned_from),
  CHECK (assigned_until > assigned_from)
);
CREATE INDEX idx_event_devices_device_time ON event_devices(device_id,assigned_from,assigned_until);
CREATE TRIGGER prevent_overlapping_device_assignments
BEFORE INSERT ON event_devices
WHEN EXISTS (
  SELECT 1 FROM event_devices ed
  WHERE ed.device_id=NEW.device_id
    AND NEW.assigned_from < ed.assigned_until
    AND NEW.assigned_until > ed.assigned_from
)
BEGIN
  SELECT RAISE(ABORT,'device assignment overlaps an existing event');
END;
CREATE TRIGGER prevent_overlapping_device_assignments_update
BEFORE UPDATE ON event_devices
WHEN EXISTS (
  SELECT 1 FROM event_devices ed
  WHERE ed.device_id=NEW.device_id
    AND NOT (ed.event_id=OLD.event_id AND ed.device_id=OLD.device_id AND ed.assigned_from=OLD.assigned_from)
    AND NEW.assigned_from < ed.assigned_until
    AND NEW.assigned_until > ed.assigned_from
)
BEGIN
  SELECT RAISE(ABORT,'device assignment overlaps an existing event');
END;

CREATE TABLE event_delivery_settings (
  event_id TEXT PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  guest_validity_days INTEGER NOT NULL DEFAULT 7 CHECK (guest_validity_days IN (7,15,30)),
  client_validity_days INTEGER NOT NULL DEFAULT 30 CHECK (client_validity_days IN (7,15,30)),
  retention_days INTEGER NOT NULL DEFAULT 30 CHECK (retention_days > 0),
  originals_enabled INTEGER NOT NULL DEFAULT 1 CHECK (originals_enabled IN (0,1)),
  client_gallery_enabled INTEGER NOT NULL DEFAULT 0 CHECK (client_gallery_enabled IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE event_configurations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','published','superseded')),
  config_json TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  published_at TEXT,
  UNIQUE(event_id,version)
);
CREATE INDEX idx_event_configurations_latest ON event_configurations(event_id,version DESC);

CREATE TABLE device_credentials (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  credential_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT,
  revoked_at TEXT
);
CREATE INDEX idx_device_credentials_active ON device_credentials(device_id,revoked_at,expires_at);

CREATE TABLE device_pairing_requests (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  device_name TEXT,
  model TEXT,
  app_version TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','completed','expired','rejected')),
  expires_at TEXT NOT NULL,
  approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);
CREATE INDEX idx_pairing_request_expiration ON device_pairing_requests(expires_at,status);

CREATE TABLE device_heartbeats (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  reported_at TEXT NOT NULL,
  battery_percent INTEGER CHECK (battery_percent BETWEEN 0 AND 100),
  printer_status TEXT CHECK (printer_status IN ('connected','disconnected','unknown')),
  available_bytes INTEGER CHECK (available_bytes >= 0),
  pending_uploads INTEGER NOT NULL DEFAULT 0 CHECK (pending_uploads >= 0),
  app_version TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_heartbeats_device_time ON device_heartbeats(device_id,reported_at DESC);

CREATE TABLE device_commands (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  command_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','acknowledged','failed','cancelled')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  acknowledged_at TEXT,
  result_json TEXT
);
CREATE INDEX idx_device_commands_queue ON device_commands(device_id,status,created_at);

CREATE TABLE photo_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  output_format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE template_versions (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL REFERENCES photo_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  schema_version TEXT NOT NULL,
  template_json TEXT NOT NULL,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE(template_id,version)
);

CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('business_logo','event_logo','background','graphic','sticker','watermark','font','other')),
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived','deleted')),
  uploaded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE template_assets (
  template_id TEXT NOT NULL REFERENCES photo_templates(id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES assets(id),
  PRIMARY KEY(template_id,asset_id)
);

CREATE TABLE photo_sessions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  device_id TEXT NOT NULL REFERENCES devices(id),
  template_version_id TEXT REFERENCES template_versions(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  client_gallery_eligible INTEGER NOT NULL DEFAULT 0 CHECK (client_gallery_eligible IN (0,1)),
  status TEXT NOT NULL DEFAULT 'pending_upload' CHECK (status IN ('pending_upload','uploading','ready','failed','expired','deleted')),
  guest_expires_at TEXT,
  client_expires_at TEXT,
  retention_expires_at TEXT,
  revoked_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  UNIQUE (device_id,idempotency_key)
);
CREATE INDEX idx_photo_sessions_event_date ON photo_sessions(event_id,captured_at);
CREATE INDEX idx_photo_sessions_retention ON photo_sessions(retention_expires_at,status);

CREATE TABLE photo_assets (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('original','composition','thumbnail')),
  object_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL CHECK (size_bytes >= 0),
  sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','deleted')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_photo_assets_session_type ON photo_assets(session_id,asset_type,status);

CREATE TABLE photo_consents (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('capture_storage','individual_delivery','client_gallery')),
  granted INTEGER NOT NULL CHECK (granted IN (0,1)),
  recorded_at TEXT NOT NULL,
  source TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX idx_photo_consents_session_type ON photo_consents(session_id,consent_type,recorded_at DESC);

CREATE TABLE guest_access_tokens (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE REFERENCES photo_sessions(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_guest_tokens_expiration ON guest_access_tokens(expires_at);

CREATE TABLE client_gallery_access (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE upload_jobs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  asset_id TEXT REFERENCES photo_assets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','uploading','uploaded','failed','retrying','cancelled')),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  last_error TEXT,
  attempted_at TEXT,
  completed_at TEXT,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_upload_jobs_status ON upload_jobs(status,created_at);

CREATE TABLE print_jobs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES photo_sessions(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id),
  status TEXT NOT NULL CHECK (status IN ('queued','printing','printed','failed','cancelled')),
  printer_model TEXT,
  copies INTEGER NOT NULL DEFAULT 1 CHECK (copies > 0),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);

CREATE TABLE storage_connections (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google_drive')),
  account_label TEXT,
  refresh_token_secret_name TEXT NOT NULL,
  connected_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  connected_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  disconnected_at TEXT
);

CREATE TABLE storage_exports (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id),
  provider TEXT NOT NULL CHECK (provider IN ('google_drive')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','cancelled')),
  destination_id TEXT,
  requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);

CREATE TABLE cleanup_jobs (
  id TEXT PRIMARY KEY,
  event_id TEXT REFERENCES events(id) ON DELETE SET NULL,
  session_id TEXT REFERENCES photo_sessions(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','completed','failed','skipped')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at TEXT
);

CREATE TABLE business_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_by TEXT REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
