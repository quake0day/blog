interface Env {
  GH_TOKEN: string;
  GH_REPO: string;
}

const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), {
    status: s,
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

function b64enc(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
}
function b64dec(s: string) {
  const bin = atob(s.replace(/\n/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

const pathFor = (slug: string) => `src/content/posts/${slug}.md`;
const pathSegments = (slug: string) =>
  `src/content/posts/${encodeURIComponent(slug)}.md`;

/** GET /api/admin/posts/:slug — fetch the post with its SHA for editing. */
export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  if (!env.GH_TOKEN || !env.GH_REPO)
    return json({ error: "GH_TOKEN and GH_REPO must be configured" }, 500);
  const slug = decodeURIComponent(String(params.slug));
  const r = await gh(env, `/repos/${env.GH_REPO}/contents/${pathSegments(slug)}`);
  if (!r.ok) return json({ error: await r.text() }, r.status);
  const data = (await r.json()) as {
    content: string;
    sha: string;
    encoding: string;
  };
  const content =
    data.encoding === "base64" ? b64dec(data.content) : data.content;
  return json({ slug, sha: data.sha, content });
};

/** PUT /api/admin/posts/:slug — update existing post.
 *  Body: { content, sha, message? } */
export const onRequestPut: PagesFunction<Env> = async ({
  params,
  request,
  env,
}) => {
  if (!env.GH_TOKEN || !env.GH_REPO)
    return json({ error: "GH_TOKEN and GH_REPO must be configured" }, 500);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad json" }, 400);
  }
  const content = String(body.content || "");
  const sha = String(body.sha || "");
  if (!content || !sha) return json({ error: "content and sha required" }, 400);

  const slug = decodeURIComponent(String(params.slug));
  const r = await gh(env, `/repos/${env.GH_REPO}/contents/${pathSegments(slug)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: body.message || `post: update ${slug} (via admin)`,
      content: b64enc(content),
      sha,
    }),
  });
  if (!r.ok) return json({ error: await r.text() }, r.status);
  const result = (await r.json()) as { content: { sha: string } };
  return json({ ok: true, sha: result.content.sha });
};

/** DELETE /api/admin/posts/:slug — delete post. Body: { sha } */
export const onRequestDelete: PagesFunction<Env> = async ({
  params,
  request,
  env,
}) => {
  if (!env.GH_TOKEN || !env.GH_REPO)
    return json({ error: "GH_TOKEN and GH_REPO must be configured" }, 500);

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  const sha = String(body.sha || "");
  if (!sha)
    return json({ error: "sha required (GET the post first to get current sha)" }, 400);

  const slug = decodeURIComponent(String(params.slug));
  const r = await gh(env, `/repos/${env.GH_REPO}/contents/${pathSegments(slug)}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: `post: delete ${slug} (via admin)`,
      sha,
    }),
  });
  if (!r.ok) return json({ error: await r.text() }, r.status);
  return json({ ok: true });
};
