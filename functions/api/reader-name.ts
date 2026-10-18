import { isAdmin, privateJson } from '../../server/admin';
import {
  readerKey,
  readerCookie,
  type ReaderEnv
} from '../../server/readers';

export const onRequestPost: PagesFunction<ReaderEnv> =
  async ({request, env}) => {
    if (
      request.headers.get('Origin') !== new URL(request.url).origin
    ) {
      return privateJson({error: '無效來源'}, 403);
    }

    if (await isAdmin(request, env)) {
      return privateJson({error: '站主無需留下訪客名字'}, 403);
    }

    try {
      const body = await request.json() as {name?: unknown};

      const name =
        typeof body.name === 'string' ? body.name.trim() : '';

      if (!name || name.length > 40) {
        return privateJson({error: '請填寫 1 至 40 字的稱呼'}, 400);
      }

      const existing = readerKey(request);
      const key = existing ?? crypto.randomUUID();

      await env.henryreads_comments.batch([
        env.henryreads_comments.prepare(
          `INSERT INTO readers(reader_key) VALUES (?)
           ON CONFLICT(reader_key) DO NOTHING`
        ).bind(key),

        env.henryreads_comments.prepare(
          `UPDATE readers SET name = ?, name_number =
           COALESCE(
             (SELECT MAX(name_number) + 1 FROM readers WHERE name = ?),
             0
           )
           WHERE reader_key = ? AND (name IS NULL OR name != ?)`
        ).bind(name, name, key, name)
      ]);

      const response = privateJson({success: true});

      if (!existing) {
        response.headers.set('Set-Cookie', readerCookie(key, request));
      }

      return response;
    } catch {
      return privateJson(
        {error: '名字儲存失敗，請再試一次。'},
        503
      );
    }
  };