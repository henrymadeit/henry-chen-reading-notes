-- Run once on the existing henryreads_comments D1 database before deploying the new site.
-- Existing comments and Henry replies remain in the comments table.
CREATE TABLE IF NOT EXISTS comment_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL,
  comment_id INTEGER NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('comment', 'legacy', 'reply')),
  target_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_owner INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (comment_id) REFERENCES comments(id)
);

CREATE INDEX IF NOT EXISTS idx_comment_replies_slug_comment
  ON comment_replies(slug, comment_id, created_at, id);
