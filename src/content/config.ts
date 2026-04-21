import { defineCollection, z } from "astro:content";

const postSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  legacyDir: z.string().optional(),
  // posts-en only: original Chinese slug so the EN page can link back.
  origSlug: z.string().optional(),
});

const posts = defineCollection({
  type: "content",
  schema: postSchema,
});

// Machine-translated English mirror of `posts`. Populated by
// scripts/translate-posts.mjs at build time; files are gitignored
// and cached between CI runs via actions/cache.
const postsEn = defineCollection({
  type: "content",
  schema: postSchema,
});

export const collections = { posts, "posts-en": postsEn };
