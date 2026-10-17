-- Run on henryreads-comments only. Additive and safe to run again.
CREATE TABLE IF NOT EXISTS readers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reader_key TEXT NOT NULL UNIQUE,
  name TEXT,
  name_number INTEGER,
  first_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  visits INTEGER NOT NULL DEFAULT 0,
  UNIQUE(name, name_number)
);
CREATE TABLE IF NOT EXISTS reader_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reader_id INTEGER NOT NULL REFERENCES readers(id),
  slug TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('view','like','unlike','comment','reply','comment-like','comment-unlike','reply-like','reply-unlike')),
  target_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS reader_events_reader ON reader_events(reader_id, id DESC);
CREATE INDEX IF NOT EXISTS reader_events_date ON reader_events(created_at);
CREATE TABLE IF NOT EXISTS reader_likes (
  reader_id INTEGER NOT NULL REFERENCES readers(id),
  slug TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL DEFAULT 0,
  liked INTEGER NOT NULL CHECK(liked IN (0,1)),
  PRIMARY KEY(reader_id, slug, target_type, target_id)
);
