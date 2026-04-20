interface Env {
  DB: D1Database;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

/** GET /api/admin/comments?status=pending|approved|rejected|all → list */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const status = new URL(request.url).searchParams.get("status") || "all";
  let sql =
    `SELECT id, post_slug, name, email, website, body, status, ip, user_agent, created_at, reviewed_at
     FROM comments`;
  const params: any[] = [];
  if (status !== "all") {
    sql += ` WHERE status = ?`;
    params.push(status);
  }
  sql += ` ORDER BY created_at DESC LIMIT 500`;
  const { results } = await env.DB.prepare(sql).bind(...params).all();

  // counts
  const counts = await env.DB.prepare(
    `SELECT status, COUNT(*) AS n FROM comments GROUP BY status`
  ).all();
  const summary: Record<string, number> = {
    pending: 0,
    approved: 0,
    rejected: 0,
  };
  for (const row of counts.results as Array<{ status: string; n: number }>) {
    summary[row.status] = row.n;
  }

  return json({ comments: results, counts: summary });
};
