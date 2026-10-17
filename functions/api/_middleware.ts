import { isAdmin } from '../../server/admin';
import { readerKey, readerCookie, recordEvent, type ReaderEnv } from '../../server/readers';

// Observe successful interactions without changing existing comment/like permissions.
export const onRequest: PagesFunction<ReaderEnv> = async context => {
  const {request, env} = context;
  const match = new URL(request.url).pathname.match(/^\/api\/(comments|likes)\/([^/]+)\/?$/);
  if (!match || !['POST','PATCH'].includes(request.method)) return context.next();
  let body: Record<string, unknown>;
  try { body = await request.clone().json() as Record<string, unknown>; }
  catch { return context.next(); }
  const response = await context.next();
  if (!response.ok) return response;
  try {
    if (await isAdmin(request, env)) return response;
    const result = await response.clone().json() as {id?: number};
    const action = body.action;
    let kind: string | undefined;
    let targetId: number | null = null;
    let name: string | undefined;
    if (match[1] === 'likes' && (action === 'like' || action === 'unlike')) kind = action;
    if (match[1] === 'comments' && request.method === 'POST') {
      kind = body.comment_id === undefined ? 'comment' : 'reply';
      targetId = result.id ?? null;
      if (typeof body.name === 'string') name = body.name.trim();
    } else if (match[1] === 'comments') {
      const actions: Record<string,string> = {like:'comment-like', unlike:'comment-unlike', 'thread-like':'reply-like', 'thread-unlike':'reply-unlike'};
      kind = typeof action === 'string' ? actions[action] : undefined;
      targetId = Number(body.id);
    }
    if (!kind) return response;
    const existing = readerKey(request), key = existing ?? crypto.randomUUID();
    await recordEvent(env.henryreads_comments, key, decodeURIComponent(match[2]), kind, targetId, name);
    if (!existing) {
      const wrapped = new Response(response.body, response);
      wrapped.headers.append('Set-Cookie', readerCookie(key, request));
      return wrapped;
    }
  } catch (error) {
    // Analytics failure must never turn a successful comment/like into an error.
    console.error('Reader tracking failed', error instanceof Error ? error.message : 'unknown');
  }
  return response;
};
