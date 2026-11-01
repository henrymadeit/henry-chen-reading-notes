CREATE TABLE IF NOT EXISTS install_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('click','installed')),
  slug TEXT NOT NULL DEFAULT '',
  device TEXT NOT NULL DEFAULT 'other',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_install_events_kind_created ON install_events(kind, created_at);
CREATE INDEX IF NOT EXISTS idx_install_events_slug ON install_events(slug);
