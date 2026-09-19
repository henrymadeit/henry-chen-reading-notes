/// <reference types="@cloudflare/workers-types" />

interface Env {
  henryreads_likes: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const slug = String(context.params.slug);

  const row = await context.env.henryreads_likes
    .prepare("SELECT count FROM likes WHERE slug = ?")
    .bind(slug)
    .first();

  const count =
    row && typeof row.count === "number"
      ? row.count
      : 0;

  return new Response(
    JSON.stringify({ likes: count }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const slug = String(context.params.slug);

  const body = await context.request.json() as {
    action?: 'like' | 'unlike';
  };

  const action = body.action;

  if (action !== 'like' && action !== 'unlike') {
    return Response.json(
      { error: '無效的按讚動作' },
      { status: 400 }
    );
  }

  await context.env.henryreads_likes
  .prepare(`
    INSERT INTO likes (slug, count)
    VALUES (?, CASE WHEN ? = 'like' THEN 1 ELSE 0 END)
    ON CONFLICT(slug) DO UPDATE SET
      count = CASE
        WHEN ? = 'like' THEN count + 1
        ELSE MAX(count - 1, 0)
      END
  `)
  .bind(slug, action, action)
  .run();

  const row = await context.env.henryreads_likes
    .prepare("SELECT count FROM likes WHERE slug = ?")
    .bind(slug)
    .first();

  const count =
    row && typeof row.count === "number"
      ? row.count
      : 0;

  return new Response(
    JSON.stringify({ likes: count }),
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
};