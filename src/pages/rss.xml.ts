import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";

export async function GET(context: APIContext) {
  const posts = (await getCollection("posts", ({ data }) => !data.draft)).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
  );
  return rss({
    title: "PSYcHiC",
    description: "Si Chen's personal blog",
    site: context.site ?? "https://quake0day.com",
    items: posts.map((p) => ({
      title: p.data.title,
      pubDate: p.data.date,
      link: `/post/${p.slug}`,
      description: (p.body ?? "").slice(0, 400).replace(/\s+/g, " ").trim(),
      categories: p.data.tags,
    })),
    customData: `<language>zh-CN</language>`,
  });
}
