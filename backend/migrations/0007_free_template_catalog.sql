ALTER TABLE photo_templates ADD COLUMN category TEXT NOT NULL DEFAULT 'Custom';
ALTER TABLE photo_templates ADD COLUMN built_in INTEGER NOT NULL DEFAULT 0 CHECK (built_in IN (0,1));
ALTER TABLE photo_templates ADD COLUMN free_available INTEGER NOT NULL DEFAULT 0 CHECK (free_available IN (0,1));
ALTER TABLE photo_templates ADD COLUMN required_photo_count INTEGER NOT NULL DEFAULT 1 CHECK (required_photo_count BETWEEN 1 AND 12);
ALTER TABLE photo_templates ADD COLUMN metadata_json TEXT NOT NULL DEFAULT '{}';

CREATE INDEX idx_photo_templates_catalog ON photo_templates(built_in,free_available,category,status);

CREATE TABLE template_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL REFERENCES photo_templates(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY(user_id,template_id)
);
