interface Env {
  henryreads_comments: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug as string;

  const { results } = await context.env.henryreads_comments
    .prepare(`
      SELECT id, name, message, created_at, likes, reply, reply_updated_at
      FROM comments
      WHERE slug = ?
      ORDER BY created_at ASC
    `)
    .bind(slug)
    .all();

  return Response.json(results);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const slug = context.params.slug as string;

  try {
    const body = await context.request.json() as {
      name?: string;
      message?: string;
    };

    const name = body.name?.trim();
    const message = body.message?.trim();

    if (!name || !message) {
      return Response.json(
        { error: "姓名與留言不能空白" },
        { status: 400 }
      );
    }

    if (name.length > 40 || message.length > 1000) {
      return Response.json(
        { error: "姓名或留言太長" },
        { status: 400 }
      );
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
      { error: "留言送出失敗" },
      { status: 500 }
    );
  }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as {
      id?: number;
    };

    const id = Number(body.id);

    if (!Number.isInteger(id) || id <= 0) {
      return Response.json(
        { error: "無效的留言編號" },
        { status: 400 }
      );
    }

    const result = await context.env.henryreads_comments
      .prepare(`
        UPDATE comments
        SET likes = likes + 1
        WHERE id = ?
        RETURNING likes
      `)
      .bind(id)
      .first<{ likes: number }>();

    if (!result) {
      return Response.json(
        { error: "找不到留言" },
        { status: 404 }
      );
    }

    return Response.json({
      success: true,
      likes: result.likes
    });
  } catch {
    return Response.json(
      { error: "按讚失敗" },
      { status: 500 }
    );
  }
};