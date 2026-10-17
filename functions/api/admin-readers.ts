import { isAdmin, privateJson } from '../../server/admin';
import { readerLabel, type ReaderEnv } from '../../server/readers';

export const onRequestGet: PagesFunction<ReaderEnv> = async ({request, env}) => {
  if (!await isAdmin(request, env)) return privateJson({error: '請先登入'}, 401);
  const url = new URL(request.url);
  const offset = Math.max(0, Math.min(1000000, Number(url.searchParams.get('offset')) || 0));
  const id = Number(url.searchParams.get('id'));
  const db = env.henryreads_comments;
  try {
    if (url.searchParams.has('id')) {
      if (!Number.isSafeInteger(id) || id <= 0) return privateJson({error: '無效讀者'}, 400);
      const reader = await db.prepare('SELECT id, name, name_number, first_seen, last_seen, visits FROM readers WHERE id = ?')
        .bind(id).first<{id:number;name:string|null;name_number:number|null}>();
      if (!reader) return privateJson({error: '找不到讀者'}, 404);
      const {results: groups} = await db.prepare(`SELECT e.slug,
        SUM(CASE WHEN e.kind = 'view' THEN 1 ELSE 0 END) AS accesses,
        MAX(CASE WHEN e.kind = 'view' THEN e.created_at END) AS last_access,
        MAX(e.id) AS latest_id,
        COALESCE((SELECT l.liked FROM reader_likes l WHERE l.reader_id = e.reader_id
          AND l.slug = e.slug AND l.target_type = 'article' AND l.target_id = 0), 0) AS liked,
        (SELECT a.created_at FROM reader_events a WHERE a.reader_id = e.reader_id
          AND a.slug = e.slug AND a.kind IN ('like','unlike') ORDER BY a.id DESC LIMIT 1) AS like_time
        FROM reader_events e WHERE e.reader_id = ? GROUP BY e.slug
        ORDER BY latest_id DESC LIMIT 51 OFFSET ?`).bind(id, offset)
        .all<{slug:string;accesses:number;last_access:string|null;liked:number;like_time:string|null}>();
      const articles = groups.slice(0,50);
      const {results: messages} = articles.length ? await db.prepare(`SELECT e.slug, e.kind, e.target_id, e.created_at,
        CASE WHEN e.kind = 'comment' THEN c.message WHEN e.kind = 'reply' THEN r.message END AS message,
        CASE WHEN e.kind = 'reply' THEN
          CASE r.target_type
            WHEN 'comment' THEN CASE WHEN target_comment.is_owner = 1 THEN '[Henry]' ELSE target_comment.name END
            WHEN 'reply' THEN CASE WHEN target_reply.is_owner = 1 THEN '[Henry]' ELSE target_reply.name END
            WHEN 'legacy' THEN '[Henry]'
          END
        END AS reply_to_name
        FROM reader_events e
        LEFT JOIN comments c ON e.kind = 'comment' AND c.id = e.target_id AND c.slug = e.slug
        LEFT JOIN comment_replies r ON e.kind = 'reply' AND r.id = e.target_id AND r.slug = e.slug
        LEFT JOIN comments target_comment ON r.target_type = 'comment'
          AND target_comment.id = r.target_id AND target_comment.id = r.comment_id AND target_comment.slug = r.slug
        LEFT JOIN comment_replies target_reply ON r.target_type = 'reply'
          AND target_reply.id = r.target_id AND target_reply.comment_id = r.comment_id AND target_reply.slug = r.slug
        WHERE e.reader_id = ? AND e.kind IN ('comment','reply')
          AND e.slug IN (${articles.map(() => '?').join(',')})
        ORDER BY e.id DESC`).bind(id, ...articles.map(a => a.slug)).all<{slug:string}>() : {results: []};
      return privateJson({reader: {...reader, label: readerLabel(reader)},
        articles: articles.map(a => ({...a, messages: messages.filter(m => m.slug === a.slug)})),
        more: groups.length > 50});
    }
    const search = (url.searchParams.get('q') ?? '').slice(0,80);
    const sort = url.searchParams.get('sort');
    const order = sort === 'visits' ? 'r.visits DESC, r.id DESC' : sort === 'comments' ? 'comments DESC, r.id DESC' : 'r.last_seen DESC, r.id DESC';
    const {results} = await db.prepare(`SELECT r.id, r.name, r.name_number, r.first_seen, r.last_seen, r.visits,
      (SELECT COUNT(DISTINCT e.slug) FROM reader_events e WHERE e.reader_id = r.id AND e.kind = 'view') AS articles,
      (SELECT COUNT(*) FROM reader_likes l WHERE l.reader_id = r.id AND l.target_type = 'article' AND l.liked = 1) AS likes,
      (SELECT COUNT(*) FROM reader_events e WHERE e.reader_id = r.id AND e.kind IN ('comment','reply')) AS comments
      FROM readers r WHERE ? = '' OR instr(COALESCE(r.name,''), ?) > 0 OR CAST(r.id AS TEXT) = ?
      ORDER BY ${order} LIMIT 51 OFFSET ?`).bind(search, search, search, offset)
      .all<{id:number;name:string|null;name_number:number|null}>();
    const totals = await db.prepare(`SELECT COUNT(*) AS readers, COALESCE(SUM(visits),0) AS visits,
      (SELECT COUNT(*) FROM reader_events WHERE kind = 'view') AS views FROM readers`).first();
    return privateJson({items: results.slice(0,50).map(r => ({...r,label:readerLabel(r)})), more:results.length > 50, totals});
  } catch {
    return privateJson({error: '無法讀取資料，請確認已套用讀者資料表 SQL。'}, 503);
  }
};
