interface Env {
  DB: D1Database;
}

const json = (d: unknown, status = 200) =>
  new Response(JSON.stringify(d), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

/** PATCH /api/admin/comments/:id  body {status: 'approved'|'rejected'|'pending'} */
export const onRequestPatch: PagesFunction<Env> = async ({ params, request, env }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "bad id" }, 400);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const status = body.status;
  if (!["approved", "rejected", "pending"].includes(status))
    return json({ error: "bad status" }, 400);

  const now = Date.now();
  const result = await env.DB.prepare(
    `UPDATE comments SET status = ?, reviewed_at = ? WHERE id = ?`
  ).bind(status, now, id).run();
  if (!result.success) return json({ error: "update failed" }, 500);
  return json({ ok: true, id, status });
};

/** DELETE /api/admin/comments/:id  — permanent removal */
export const onRequestDelete: PagesFunction<Env> = async ({ params, env }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) return json({ error: "bad id" }, 400);
  const result = await env.DB.prepare(`DELETE FROM comments WHERE id = ?`)
    .bind(id)
    .run();
  if (!result.success) return json({ error: "delete failed" }, 500);
  return json({ ok: true, id });
};
