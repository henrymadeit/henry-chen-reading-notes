import { isAdmin, privateJson } from '../../server/admin';
import type { ReaderEnv } from '../../server/readers';

type PendingMessage = {
  id: number;
  slug: string;
  comment_id: number;
  type: 'comment' | 'reply';
  name: string;
  message: string;
  created_at: string;
  total: number;
};

export const onRequestGet: PagesFunction<ReaderEnv> = async ({
  request,
  env
}) => {
  if (!await isAdmin(request, env)) {
    return privateJson({ error: '請先登入' }, 401);
  }

  const url = new URL(request.url);
  const requestedOffset = Number(url.searchParams.get('offset')) || 0;
  const offset = Math.max(
    0,
    Math.min(1000000, Math.floor(requestedOffset))
  );

  const db = env.henryreads_comments;

  try {
    // 若資料表仍有舊版站主回覆欄位，也納入判斷。
    const { results: columns } = await db
      .prepare('PRAGMA table_info(comments)')
      .all<{ name: string }>();

    const legacyColumns = ['reply', 'reply_message'].filter(
      name => columns.some(column => column.name === name)
    );

    const legacyCondition = legacyColumns
      .map(name => `AND TRIM(COALESCE(c.${name}, '')) = ''`)
      .join('\n');

    const { results } = await db.prepare(`
      WITH pending AS (
        -- 訪客的第一層留言：尚無站主直接回覆。
        SELECT
          c.id,
          c.slug,
          c.id AS comment_id,
          'comment' AS type,
          c.name,
          c.message,
          c.created_at
        FROM comments c
        WHERE COALESCE(c.is_owner, 0) = 0
          ${legacyCondition}
          AND NOT EXISTS (
            SELECT 1
            FROM comment_replies owner_reply
            WHERE owner_reply.slug = c.slug
              AND owner_reply.comment_id = c.id
              AND owner_reply.target_type = 'comment'
              AND owner_reply.target_id = c.id
              AND owner_reply.is_owner = 1
          )

        UNION ALL

        -- 訪客的回覆：尚無站主直接回覆該則。
        SELECT
          r.id,
          r.slug,
          r.comment_id,
          'reply' AS type,
          r.name,
          r.message,
          r.created_at
        FROM comment_replies r
        JOIN comments c
          ON c.id = r.comment_id
          AND c.slug = r.slug
        WHERE COALESCE(r.is_owner, 0) = 0
          AND NOT EXISTS (
            SELECT 1
            FROM comment_replies owner_reply
            WHERE owner_reply.slug = r.slug
              AND owner_reply.comment_id = r.comment_id
              AND owner_reply.target_type = 'reply'
              AND owner_reply.target_id = r.id
              AND owner_reply.is_owner = 1
          )
      )
      SELECT *, COUNT(*) OVER() AS total
      FROM pending
      ORDER BY created_at DESC, id DESC, type ASC
      LIMIT 51 OFFSET ?
    `).bind(offset).all<PendingMessage>();

    return privateJson({
      items: results.slice(0, 50).map(({ total, ...item }) => item),
      total: results[0]?.total ?? 0,
      more: results.length > 50
    });
  } catch {
    return privateJson({ error: '無法讀取未回覆留言' }, 503);
  }
};