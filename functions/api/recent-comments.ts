interface Env {
  henryreads_comments: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results } = await context.env.henryreads_comments
      .prepare(`
        SELECT
          id,
          slug,
          name,
          message,
          created_at,
          'comment' AS type,
          NULL AS reply_to_name
        FROM comments
        WHERE created_at >= datetime('now', '-720 hours')

        UNION ALL

        SELECT
          r.id,
          r.slug,

          CASE
            WHEN r.is_owner = 1 THEN '[Henry]'
            ELSE r.name
          END AS name,

          r.message,
          r.created_at,
          'reply' AS type,

          CASE
            WHEN r.target_type = 'comment'
              THEN (
                SELECT c.name
                FROM comments c
                WHERE c.id = r.target_id
              )

            WHEN r.target_type = 'reply'
              THEN (
                SELECT
                  CASE
                    WHEN parent.is_owner = 1 THEN '[Henry]'
                    ELSE parent.name
                  END
                FROM comment_replies parent
                WHERE parent.id = r.target_id
              )

            WHEN r.target_type = 'legacy'
              THEN '[Henry]'

            ELSE NULL
          END AS reply_to_name

        FROM comment_replies r
        WHERE r.created_at >= datetime('now', '-720 hours')

        ORDER BY created_at DESC, id DESC
        LIMIT 8
      `)
      .all();

    return Response.json(
      { items: results ?? [] },
      {
        headers: {
          'Cache-Control': 'public, max-age=60'
        }
      }
    );

  } catch (error) {
    console.error('Recent comments API error:', error);

    return Response.json(
      { error: '無法取得最新留言' },
      { status: 500 }
    );
  }
};