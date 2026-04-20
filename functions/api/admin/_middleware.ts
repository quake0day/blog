interface Env {
  ADMIN_PASSWORD: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const provided = request.headers.get("X-Admin-Password") || "";
  if (!env.ADMIN_PASSWORD) {
    return new Response("ADMIN_PASSWORD not configured", { status: 500 });
  }
  if (provided !== env.ADMIN_PASSWORD) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }
  return next();
};
