-- Apply only through the isolated D1 migration runner supplied in this package.

-- The D1 migration transaction owns commit/rollback; do not add BEGIN/COMMIT.

PRAGMA defer_foreign_keys = ON;

CREATE TABLE reader_remap_20261109_checks (check_name TEXT PRIMARY KEY, passed INTEGER NOT NULL CHECK(passed = 1));

INSERT INTO reader_remap_20261109_checks VALUES ('positive_original_ids', (NOT EXISTS (SELECT 1 FROM readers WHERE id <= 0)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_events_no_orphans_before', (NOT EXISTS (SELECT 1 FROM reader_events c LEFT JOIN readers r ON r.id = c.reader_id WHERE r.id IS NULL)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_likes_no_orphans_before', (NOT EXISTS (SELECT 1 FROM reader_likes c LEFT JOIN readers r ON r.id = c.reader_id WHERE r.id IS NULL)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_traffic_no_orphans_before', (NOT EXISTS (SELECT 1 FROM reader_traffic c LEFT JOIN readers r ON r.id = c.reader_id WHERE r.id IS NULL)));

CREATE TABLE reader_remap_20261109_before_readers AS SELECT * FROM readers;

CREATE TABLE reader_remap_20261109_before_reader_events AS SELECT * FROM reader_events;

CREATE TABLE reader_remap_20261109_before_reader_likes AS SELECT * FROM reader_likes;

CREATE TABLE reader_remap_20261109_before_reader_traffic AS SELECT * FROM reader_traffic;

CREATE TABLE reader_remap_20261109_before_sequence AS SELECT * FROM sqlite_sequence WHERE name = 'readers';

CREATE TABLE reader_remap_20261109_map (
  old_id INTEGER PRIMARY KEY,
  new_id INTEGER NOT NULL UNIQUE,
  reader_key TEXT NOT NULL UNIQUE
);

INSERT INTO reader_remap_20261109_map (old_id, new_id, reader_key)
SELECT id, ROW_NUMBER() OVER (ORDER BY id), reader_key FROM readers;

UPDATE reader_events SET reader_id = -(
  SELECT new_id FROM reader_remap_20261109_map WHERE old_id = reader_events.reader_id
);

UPDATE reader_likes SET reader_id = -(
  SELECT new_id FROM reader_remap_20261109_map WHERE old_id = reader_likes.reader_id
);

UPDATE reader_traffic SET reader_id = -(
  SELECT new_id FROM reader_remap_20261109_map WHERE old_id = reader_traffic.reader_id
);

UPDATE readers SET id = -(SELECT new_id FROM reader_remap_20261109_map WHERE old_id = readers.id);

UPDATE readers SET id = -id;

UPDATE reader_events SET reader_id = -reader_id;

UPDATE reader_likes SET reader_id = -reader_id;

UPDATE reader_traffic SET reader_id = -reader_id;

INSERT INTO reader_remap_20261109_checks VALUES ('readers_same_count', ((SELECT COUNT(*) FROM readers) = (SELECT COUNT(*) FROM reader_remap_20261109_before_readers)));

INSERT INTO reader_remap_20261109_checks VALUES ('readers_same_records', (NOT EXISTS (SELECT id, reader_key, name, name_number, first_seen, last_seen, visits FROM readers EXCEPT SELECT m.new_id, b.reader_key, b.name, b.name_number, b.first_seen, b.last_seen, b.visits FROM reader_remap_20261109_before_readers b JOIN reader_remap_20261109_map m ON m.old_id = b.id) AND NOT EXISTS (SELECT m.new_id, b.reader_key, b.name, b.name_number, b.first_seen, b.last_seen, b.visits FROM reader_remap_20261109_before_readers b JOIN reader_remap_20261109_map m ON m.old_id = b.id EXCEPT SELECT id, reader_key, name, name_number, first_seen, last_seen, visits FROM readers)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_events_same_count', ((SELECT COUNT(*) FROM reader_events) = (SELECT COUNT(*) FROM reader_remap_20261109_before_reader_events)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_events_same_records', (NOT EXISTS (SELECT id, reader_id, slug, kind, target_id, created_at FROM reader_events EXCEPT SELECT b.id, m.new_id, b.slug, b.kind, b.target_id, b.created_at FROM reader_remap_20261109_before_reader_events b JOIN reader_remap_20261109_map m ON m.old_id = b.reader_id) AND NOT EXISTS (SELECT b.id, m.new_id, b.slug, b.kind, b.target_id, b.created_at FROM reader_remap_20261109_before_reader_events b JOIN reader_remap_20261109_map m ON m.old_id = b.reader_id EXCEPT SELECT id, reader_id, slug, kind, target_id, created_at FROM reader_events)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_likes_same_count', ((SELECT COUNT(*) FROM reader_likes) = (SELECT COUNT(*) FROM reader_remap_20261109_before_reader_likes)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_likes_same_records', (NOT EXISTS (SELECT reader_id, slug, target_type, target_id, liked FROM reader_likes EXCEPT SELECT m.new_id, b.slug, b.target_type, b.target_id, b.liked FROM reader_remap_20261109_before_reader_likes b JOIN reader_remap_20261109_map m ON m.old_id = b.reader_id) AND NOT EXISTS (SELECT m.new_id, b.slug, b.target_type, b.target_id, b.liked FROM reader_remap_20261109_before_reader_likes b JOIN reader_remap_20261109_map m ON m.old_id = b.reader_id EXCEPT SELECT reader_id, slug, target_type, target_id, liked FROM reader_likes)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_traffic_same_count', ((SELECT COUNT(*) FROM reader_traffic) = (SELECT COUNT(*) FROM reader_remap_20261109_before_reader_traffic)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_traffic_same_records', (NOT EXISTS (SELECT id, reader_id, slug, source, created_at FROM reader_traffic EXCEPT SELECT b.id, m.new_id, b.slug, b.source, b.created_at FROM reader_remap_20261109_before_reader_traffic b JOIN reader_remap_20261109_map m ON m.old_id = b.reader_id) AND NOT EXISTS (SELECT b.id, m.new_id, b.slug, b.source, b.created_at FROM reader_remap_20261109_before_reader_traffic b JOIN reader_remap_20261109_map m ON m.old_id = b.reader_id EXCEPT SELECT id, reader_id, slug, source, created_at FROM reader_traffic)));

INSERT INTO reader_remap_20261109_checks VALUES ('contiguous_ids', ((SELECT COALESCE(MIN(id), 1) = 1 AND COALESCE(MAX(id), 0) = COUNT(*) FROM readers)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_events_no_orphans_after', (NOT EXISTS (SELECT 1 FROM reader_events c LEFT JOIN readers r ON r.id = c.reader_id WHERE r.id IS NULL)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_likes_no_orphans_after', (NOT EXISTS (SELECT 1 FROM reader_likes c LEFT JOIN readers r ON r.id = c.reader_id WHERE r.id IS NULL)));

INSERT INTO reader_remap_20261109_checks VALUES ('reader_traffic_no_orphans_after', (NOT EXISTS (SELECT 1 FROM reader_traffic c LEFT JOIN readers r ON r.id = c.reader_id WHERE r.id IS NULL)));

DELETE FROM sqlite_sequence WHERE name = 'readers';

INSERT INTO sqlite_sequence (name, seq) SELECT 'readers', COALESCE(MAX(id), 0) FROM readers;

INSERT INTO reader_remap_20261109_checks VALUES ('sequence_equals_current_max', ((SELECT seq FROM sqlite_sequence WHERE name = 'readers') = (SELECT COALESCE(MAX(id), 0) FROM readers)));
