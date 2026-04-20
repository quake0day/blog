interface Env {
  DB: D1Database;
}

const MAX_NAME = 80;
const MAX_BODY = 2000;
const MAX_EMAIL = 120;
const MAX_URL = 200;
const RATE_WINDOW_MS = 60 * 1000;

const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const bad = (msg: string, status = 400) => json({ error: msg }, status);

function sanitize(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

/** GET /api/comments?slug=XXX → approved comments for that post, oldest first. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const slug = new URL(request.url).searchParams.get("slug");
  if (!slug) return bad("missing slug");
  const { results } = await env.DB.prepare(
    `SELECT id, name, website, body, created_at
       FROM comments
      WHERE post_slug = ? AND status = 'approved'
      ORDER BY created_at ASC`
  ).bind(slug).all();
  return json({ comments: results });
};

/** POST /api/comments → submit a new comment (goes to 'pending'). */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return bad("invalid json");
  }

  // Honeypot: if filled, silently "succeed" without writing
  if (typeof body.hp_url === "string" && body.hp_url.length > 0) {
    return json({ ok: true, honeypot: true });
  }

  const slug = sanitize(body.slug, 256);
  const name = sanitize(body.name, MAX_NAME);
  const commentBody = sanitize(body.body, MAX_BODY);
  const email = sanitize(body.email, MAX_EMAIL);
  const website = sanitize(body.website, MAX_URL);

  if (!slug) return bad("missing slug");
  if (!name) return bad("请填写姓名 (name required)");
  if (name.length < 1) return bad("姓名太短");
  if (!commentBody) return bad("请填写留言 (comment required)");
  if (commentBody.length < 2) return bad("留言太短");

  // Basic sanity on email/website
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return bad("邮箱格式不对");
  if (website && !/^https?:\/\//i.test(website))
    return bad("网址要以 http:// 或 https:// 开头");

  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-forwarded-for") ||
    "";
  const ua = (request.headers.get("User-Agent") || "").slice(0, 256);
  const now = Date.now();

  // Rate limit: same IP+slug within RATE_WINDOW_MS
  if (ip) {
    const recent = await env.DB.prepare(
      `SELECT id FROM comments
        WHERE ip = ? AND post_slug = ? AND created_at > ?
        LIMIT 1`
    )
      .bind(ip, slug, now - RATE_WINDOW_MS)
      .first();
    if (recent) return bad("提交太频繁,请稍后再试", 429);
  }

  await env.DB.prepare(
    `INSERT INTO comments (post_slug, name, email, website, body, status, ip, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)`
  )
    .bind(slug, name, email || null, website || null, commentBody, ip, ua, now)
    .run();

  return json({ ok: true, message: "评论已提交,等待管理员审核后显示。" });
};
