import { isAdmin, privateJson } from '../../server/admin';
import type { ReaderEnv } from '../../server/readers';

export const onRequestGet: PagesFunction<ReaderEnv> = async ({request, env}) => {
  if (!await isAdmin(request, env)) return privateJson({error:'請先登入'},401);
  const offset = Math.max(0, Math.min(1000000, Number(new URL(request.url).searchParams.get('offset')) || 0));
  try {
    const {results} = await env.henryreads_comments.prepare(`
      SELECT id, slug, id AS comment_id, 'comment' AS type, name, message, created_at, is_owner
      FROM comments
      UNION ALL
      SELECT id, slug, comment_id, 'reply' AS type, name, message, created_at, is_owner
      FROM comment_replies
      ORDER BY created_at DESC, id DESC LIMIT 51 OFFSET ?`).bind(offset).all();
    return privateJson({items:results.slice(0,50), more:results.length > 50});
  } catch { return privateJson({error:'無法讀取留言'},503); }
};
