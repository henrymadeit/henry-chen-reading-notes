/// <reference types="@cloudflare/workers-types" />
export interface ReaderEnv { henryreads_comments: D1Database; ADMIN_PASSWORD: string }
export const cookieName = 'henry_reader';
export function readerKey(request: Request) {
  const value = (request.headers.get('Cookie') ?? '').split(';').map(x => x.trim())
    .find(x => x.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}
export function readerCookie(key: string, request: Request) {
  return `${cookieName}=${key}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export async function recordEvent(db: D1Database, key: string, slug: string, kind: string, targetId: number | null = null, name?: string) {
  const statements = [db.prepare('INSERT INTO readers(reader_key) VALUES (?) ON CONFLICT(reader_key) DO NOTHING').bind(key)];
  if (name) {
    statements.push(db.prepare(`UPDATE readers SET name = ?, name_number =
      COALESCE((SELECT MAX(name_number) + 1 FROM readers WHERE name = ?), 0)
      WHERE reader_key = ? AND (name IS NULL OR name != ?)`)
      .bind(name, name, key, name));
  }
  // A visit begins on the first event, or after 30 minutes without activity.
  statements.push(db.prepare(`UPDATE readers SET visits = visits + CASE
    WHEN visits = 0 OR last_seen < datetime('now', '-30 minutes') THEN 1 ELSE 0 END,
    last_seen = CURRENT_TIMESTAMP WHERE reader_key = ?`).bind(key));
  statements.push(db.prepare(`INSERT INTO reader_events(reader_id, slug, kind, target_id)
    SELECT id, ?, ?, ? FROM readers WHERE reader_key = ?`).bind(slug, kind, targetId, key));
  if (['like','unlike','comment-like','comment-unlike','reply-like','reply-unlike'].includes(kind)) {
    const target = kind.startsWith('comment-') ? 'comment' : kind.startsWith('reply-') ? 'reply' : 'article';
    statements.push(db.prepare(`INSERT INTO reader_likes(reader_id, slug, target_type, target_id, liked)
      SELECT id, ?, ?, ?, ? FROM readers WHERE reader_key = ?
      ON CONFLICT(reader_id, slug, target_type, target_id) DO UPDATE SET liked = excluded.liked`)
      .bind(slug, target, targetId ?? 0, kind.endsWith('unlike') ? 0 : 1, key));
  }
  await db.batch(statements);
}

export const readerLabel = (r: {id: number; name: string | null; name_number: number | null}) =>
  r.name ? `${r.name}${r.name_number ? r.name_number : ''}` : `訪客${String(r.id).padStart(3, '0')}`;
