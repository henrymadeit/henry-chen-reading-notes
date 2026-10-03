interface Env {
  henryreads_comments: D1Database;
  ADMIN_PASSWORD: string;
}

async function makeAdminToken(password: string) {
  const data = new TextEncoder().encode(`henryreads-admin:${password}`);
  const hash = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function isAdmin(context: EventContext<Env, string, unknown>) {
  const cookie = context.request.headers.get('Cookie') ?? '';

  const adminCookie = cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('henry_admin='));

  if (!adminCookie) return false;

  const token = adminCookie.substring('henry_admin='.length);
  const expectedToken = await makeAdminToken(context.env.ADMIN_PASSWORD);

  return token === expectedToken;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug as string;

  const { results: comments } = await context.env.henryreads_comments
    .prepare(`
      SELECT id, name, message, created_at, likes, reply, reply_updated_at, reply_likes
      FROM comments
      WHERE slug = ?
      ORDER BY created_at ASC
    `)
    .bind(slug)
    .all();

  const { results: replies } = await context.env.henryreads_comments
    .prepare(`
      SELECT id, comment_id, target_type, target_id, name, message,
             created_at, likes, is_owner
      FROM comment_replies
      WHERE slug = ?
      ORDER BY created_at ASC, id ASC
    `)
    .bind(slug)
    .all();

  return Response.json(comments.map((comment) => ({
    ...comment,
    replies: replies.filter((reply) => reply.comment_id === comment.id)
  })));
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug as string;

  try {
    const body = await context.request.json() as {
      name?: string;
      message?: string;
      comment_id?: number;
      target_type?: 'comment' | 'legacy' | 'reply';
      target_id?: number;
    };

    const message = body.message?.trim();

    const commentId = Number(body.comment_id);
    const isReply = body.comment_id !== undefined;
    const owner = await isAdmin(context);
    const name = owner && isReply ? 'Henry' : body.name?.trim();

    if (!name || !message) {
      return Response.json(
        { error: '姓名與留言不能空白' },
        { status: 400 }
      );
    }

    if (name.length > 40 || message.length > 1000) {
      return Response.json(
        { error: '姓名或留言太長' },
        { status: 400 }
      );
    }

    if (isReply) {
      const targetId = Number(body.target_id);
      const targetType = body.target_type;
      if (!Number.isInteger(commentId) || commentId <= 0 ||
          !Number.isInteger(targetId) || targetId <= 0 ||
          !['comment', 'legacy', 'reply'].includes(targetType ?? '')) {
        return Response.json({ error: '無效的回覆對象' }, { status: 400 });
      }

      const root = await context.env.henryreads_comments
        .prepare('SELECT id, reply FROM comments WHERE id = ? AND slug = ?')
        .bind(commentId, slug)
        .first<{ id: number; reply: string | null }>();
      if (!root) return Response.json({ error: '找不到留言' }, { status: 404 });

      if (targetType === 'comment' && targetId !== root.id ||
          targetType === 'legacy' && (targetId !== root.id || !root.reply)) {
        return Response.json({ error: '無效的回覆對象' }, { status: 400 });
      }
      if (targetType === 'reply') {
        const target = await context.env.henryreads_comments
          .prepare('SELECT id FROM comment_replies WHERE id = ? AND comment_id = ? AND slug = ?')
          .bind(targetId, commentId, slug)
          .first();
        if (!target) return Response.json({ error: '找不到回覆對象' }, { status: 404 });
      }

      const result = await context.env.henryreads_comments
        .prepare(`
          INSERT INTO comment_replies
            (slug, comment_id, target_type, target_id, name, message, is_owner)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(slug, commentId, targetType, targetId, name, message, owner ? 1 : 0)
        .run();
      return Response.json({ success: true, id: result.meta.last_row_id }, { status: 201 });
    }

    const result = await context.env.henryreads_comments
      .prepare(`
        INSERT INTO comments (slug, name, message)
        VALUES (?, ?, ?)
      `)
      .bind(slug, name, message)
      .run();

    return Response.json(
      { success: true, id: result.meta.last_row_id },
      { status: 201 }
    );
  } catch {
    return Response.json(
      { error: '留言送出失敗' },
      { status: 500 }
    );
  }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug as string;
  try {
    const body = await context.request.json() as {
      id?: number;
      action?: 'like' | 'unlike' | 'reply' | 'reply-like' | 'reply-unlike' | 'thread-like' | 'thread-unlike';
      reply?: string;
    };

    const id = Number(body.id);
    const action = body.action;

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json(
        { error: '無效的留言編號' },
        { status: 400 }
      );
    }

    if (action === 'thread-like' || action === 'thread-unlike') {
      const result = await context.env.henryreads_comments
        .prepare(`
          UPDATE comment_replies
          SET likes = CASE WHEN ? = 'thread-like' THEN likes + 1
                           ELSE MAX(likes - 1, 0) END
          WHERE id = ? AND slug = ?
          RETURNING likes
        `)
        .bind(action, id, slug)
        .first<{ likes: number }>();
      if (!result) return Response.json({ error: '找不到回覆' }, { status: 404 });
      return Response.json({ success: true, likes: result.likes });
    }

    if (action === 'reply') {
      const admin = await isAdmin(context);

      if (!admin) {
        return Response.json(
          { error: '未授權' },
          { status: 401 }
        );
      }

      const reply = body.reply?.trim();

      if (!reply) {
        return Response.json(
          { error: '回覆不能空白' },
          { status: 400 }
        );
      }

      if (reply.length > 1000) {
        return Response.json(
          { error: '回覆太長' },
          { status: 400 }
        );
      }

      const result = await context.env.henryreads_comments
        .prepare(`
          UPDATE comments
          SET reply = ?,
              reply_updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND slug = ?
          RETURNING reply, reply_updated_at
        `)
        .bind(reply, id, slug)
        .first<{
          reply: string;
          reply_updated_at: string;
        }>();

      if (!result) {
        return Response.json(
          { error: '找不到留言' },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        reply: result.reply,
        reply_updated_at: result.reply_updated_at
      });
    }

    if (action === 'reply-like' || action === 'reply-unlike') {
      const result = await context.env.henryreads_comments
      .prepare(`
        UPDATE comments
        SET reply_likes = CASE
          WHEN ? = 'reply-like' THEN reply_likes + 1
          ELSE MAX(reply_likes - 1, 0)
        END
        WHERE id = ? AND slug = ? AND reply IS NOT NULL
        RETURNING reply_likes
      `)
      .bind(action, id, slug)
      .first<{ reply_likes: number }>();

      if (!result) {
        return Response.json(
          { error: '找不到留言' },
          { status: 404 }
        );
      }

      return Response.json({
        success: true,
        reply_likes: result.reply_likes
      });
    }

    if (action !== 'like' && action !== 'unlike') {
      return Response.json(
        { error: '無效的按讚動作' },
        { status: 400 }
      );
    }

    const result = await context.env.henryreads_comments
      .prepare(`
        UPDATE comments
        SET likes = CASE
          WHEN ? = 'like' THEN likes + 1
          ELSE MAX(likes - 1, 0)
        END
        WHERE id = ? AND slug = ?
        RETURNING likes
      `)
      .bind(action, id, slug)
      .first<{ likes: number }>();

    if (!result) {
      return Response.json(
        { error: '找不到留言' },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      likes: result.likes
    });

  } catch {
    return Response.json(
      { error: '操作失敗' },
      { status: 500 }
    );
  }
};
