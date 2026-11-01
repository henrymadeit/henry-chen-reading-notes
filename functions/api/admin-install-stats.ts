import { isAdmin, privateJson } from '../../server/admin';
import type { ReaderEnv } from '../../server/readers';

type Counts = { clicks: number; installed: number; last_click: string | null };
type Source = { slug: string; clicks: number };

export const onRequestGet: PagesFunction<ReaderEnv> = async ({ request, env }) => {
  if (!await isAdmin(request, env)) return privateJson({ error: '請先登入' }, 401);
  try {
    const db = env.henryreads_comments;
    const totals = await db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN kind='click' THEN 1 ELSE 0 END), 0) AS clicks,
        COALESCE(SUM(CASE WHEN kind='installed' THEN 1 ELSE 0 END), 0) AS installed,
        MAX(CASE WHEN kind='click' THEN created_at END) AS last_click
      FROM install_events
    `).first<Counts>();
    const { results } = await db.prepare(`
      SELECT slug, COUNT(*) AS clicks FROM install_events
      WHERE kind='click' GROUP BY slug ORDER BY clicks DESC, slug ASC LIMIT 10
    `).all<Source>();
    return privateJson({ totals: totals ?? {clicks:0, installed:0, last_click:null}, sources: results });
  } catch {
    return privateJson({ error: '無法讀取桌面捷徑統計，請確認 install_events SQL 已執行' }, 503);
  }
};
