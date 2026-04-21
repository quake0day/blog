interface Env {
  GH_TOKEN: string;
  GH_REPO: string; // e.g. "quake0day/blog"
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const gh = (env: Env, path: string, init: RequestInit = {}) =>
  fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      ...(init.headers as Record<string, string>),
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "quake0day-blog-admin",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

function b64enc(s: string): string {
  // UTF-8 safe base64 encode
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}

/** GET /api/admin/posts — list all .md files in src/content/posts/ */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  if (!env.GH_TOKEN || !env.GH_REPO) {
    return json({ error: "GH_TOKEN and GH_REPO must be configured" }, 500);
  }
  const r = await gh(env, `/repos/${env.GH_REPO}/contents/src/content/posts`);
  if (!r.ok) return json({ error: await r.text() }, r.status);
  const files = (await r.json()) as Array<{
    name: string;
    path: string;
    sha: string;
    size: number;
  }>;
  const posts = files
    .filter((f) => f.name.endsWith(".md"))
    .map((f) => {
      const slug = f.name.replace(/\.md$/, "");
      const m = slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
      return {
        slug,
        filename: f.name,
        sha: f.sha,
        size: f.size,
        date: m ? m[1] : null,
        title: m ? m[2].replace(/-/g, " ") : slug,
      };
    })
    .sort((a, b) => (b.slug > a.slug ? 1 : -1));
  return json({ posts });
};

/** POST /api/admin/posts — create a new post.
 *  Body: { filename: "YYYY-MM-DD-slug.md", content: "---\ntitle:...\n---\n...body" }
 */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.GH_TOKEN || !env.GH_REPO) {
    return json({ error: "GH_TOKEN and GH_REPO must be configured" }, 500);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }

  const filename = String(body.filename || "").trim();
  const content = String(body.content || "");
  if (!filename || !content)
    return json({ error: "filename and content are required" }, 400);

  // filename: must end in .md, no slashes, no weird chars
  if (!/\.md$/.test(filename) || filename.includes("/") || filename.length > 200)
    return json({ error: "invalid filename (must be <slug>.md, no slashes)" }, 400);

  // Auto-lowercase ASCII in filename to match Astro's URL behavior
  const lowered = filename.replace(/[A-Z]/g, (c) => c.toLowerCase());
  const path = `src/content/posts/${lowered}`;

  const r = await gh(env, `/repos/${env.GH_REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: `post: create ${lowered.replace(/\.md$/, "")} (via admin)`,
      content: b64enc(content),
    }),
  });

  if (!r.ok) {
    const txt = await r.text();
    return json({ error: txt }, r.status);
  }
  const result = (await r.json()) as { content: { sha: string } };
  return json({
    ok: true,
    filename: lowered,
    slug: lowered.replace(/\.md$/, ""),
    sha: result.content.sha,
  });
};
