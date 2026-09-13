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

  await context.env.henryreads_likes
    .prepare(
      "INSERT INTO likes (slug, count) VALUES (?, 1) " +
      "ON CONFLICT(slug) DO UPDATE SET count = count + 1"
    )
    .bind(slug)
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