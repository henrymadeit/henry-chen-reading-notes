import { isAdmin, privateJson } from '../../server/admin';
import type { ReaderEnv } from '../../server/readers';

type EventData = { kind?: unknown; slug?: unknown; device?: unknown };

export const onRequestPost: PagesFunction<ReaderEnv> = async ({ request, env }) => {
  if (await isAdmin(request, env)) return privateJson({ success: true });
  if (request.headers.get('Origin') !== new URL(request.url).origin) {
    return privateJson({ error: '無效來源' }, 403);
  }
  try {
    const body = await request.json() as EventData;
    if (body.kind !== 'click' && body.kind !== 'installed') {
      return privateJson({ error: '無效事件' }, 400);
    }
    const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
    if (!slug || slug.length > 200 || !/^[a-zA-Z0-9/_-]+$/.test(slug)) {
      return privateJson({ error: '無效文章' }, 400);
    }
    const device = typeof body.device === 'string' &&
      ['android', 'ios', 'windows', 'mac', 'other'].includes(body.device)
      ? body.device : 'other';
    await env.henryreads_comments.prepare(
      'INSERT INTO install_events (kind, slug, device) VALUES (?, ?, ?)'
    ).bind(body.kind, slug, device).run();
    return privateJson({ success: true });
  } catch {
    return privateJson({ error: '無法記錄桌面捷徑事件' }, 503);
  }
};
