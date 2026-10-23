import { isAdmin, privateJson } from '../../server/admin';
import { classifySource } from '../../server/traffic';
import { readerKey, readerCookie, recordEvent, type ReaderEnv } from '../../server/readers';

export const onRequestPost: PagesFunction<ReaderEnv> = async ({request, env}) => {
  if (await isAdmin(request, env)) return privateJson({ success: true });
  if (request.headers.get('Origin') !== new URL(request.url).origin) return privateJson({error: '無效來源'}, 403);
  try {
    const body = await request.json() as {slug?: unknown; source?:unknown; referrer?:unknown};
    if (typeof body.slug !== 'string' || !body.slug || body.slug.length > 200) return privateJson({error: '無效文章'}, 400);
    const existing = readerKey(request), key = existing ?? crypto.randomUUID();
    const source = classifySource(body.source, body.referrer, new URL(request.url).origin);
    await recordEvent(env.henryreads_comments, key, body.slug, 'view', null, undefined, source);
    const response = privateJson({success: true});
    if (!existing) response.headers.set('Set-Cookie', readerCookie(key, request));
    return response;
  } catch {
    return privateJson({error: '無法記錄瀏覽'}, 503);
  }
};
