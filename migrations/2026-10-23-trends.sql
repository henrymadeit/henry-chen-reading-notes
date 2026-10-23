-- Additive; safe to run again. Existing events and comments are preserved.
CREATE TABLE IF NOT EXISTS reader_traffic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reader_id INTEGER NOT NULL REFERENCES readers(id),
  slug TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS reader_traffic_date ON reader_traffic(created_at);
