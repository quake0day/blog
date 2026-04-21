#!/usr/bin/env node
/**
 * scripts/translate-posts.mjs
 *
 * Mirrors every post under src/content/posts/ to src/content/posts-en/
 * by calling Cloudflare Workers AI. Translation is incremental: we SHA-256
 * each source file and skip posts whose hash matches the manifest.
 *
 * Env (CI injects from repo secrets):
 *   CLOUDFLARE_ACCOUNT_ID
 *   CLOUDFLARE_API_TOKEN   (must include Account → Workers AI: Read)
 *
 * Behavior when credentials / permissions are missing:
 *   logs a warning, exits 0. The build continues; /en/* routes render
 *   from whatever translations are already cached (possibly none on
 *   first run).
 *
 * Model: @cf/meta/llama-3.3-70b-instruct-fp8-fast. Swap MODEL below
 * if a better model becomes available.
 */

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

const POSTS_DIR = "src/content/posts";
const POSTS_EN_DIR = "src/content/posts-en";
const MANIFEST_PATH = join(POSTS_EN_DIR, ".hashes.json");
const TAGS_MAP_PATH = join(POSTS_EN_DIR, ".tags.json");

const MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const CHUNK_CHAR_LIMIT = 3000; // rough budget for markdown chunks
const MAX_TOKENS = 4096;
const MAX_RETRIES = 3;

// Declared up-front (not after the main driver) so the hoisted
// helper functions can reach it before TDZ releases.
const SYSTEM_PROMPT =
  "You are a professional literary translator specialized in Chinese→English. Translate faithfully into natural, readable English that preserves the author's voice, tone, rhythm, and cultural nuance. For markdown input, preserve ALL markdown syntax verbatim (headings, links, images, code blocks, lists, HTML tags, emphasis markers). Do not translate code, URLs, filenames, or content inside backticks or fenced code blocks. Do not add a preamble, apology, translator's note, or explanation. Output ONLY the translation.";

const ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const FORCE = process.argv.includes("--force");

if (!ACCOUNT || !TOKEN) {
  console.warn(
    "[translate] CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN missing — skipping translation. /en/ routes will be built from whatever posts-en cache exists."
  );
  process.exit(0);
}

mkdirSync(POSTS_EN_DIR, { recursive: true });
const manifest = existsSync(MANIFEST_PATH)
  ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
  : {};
const tagsMap = existsSync(TAGS_MAP_PATH)
  ? JSON.parse(readFileSync(TAGS_MAP_PATH, "utf8"))
  : {};

const files = readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith(".md"))
  .sort();

let translated = 0;
let skipped = 0;
let failed = 0;

// Determine what needs work before we start, so rate-limit errors don't
// strand the run — each post is atomic (we persist the manifest after
// each success).
for (const file of files) {
  const slug = file.replace(/\.md$/, "");
  const srcPath = join(POSTS_DIR, file);
  const dstPath = join(POSTS_EN_DIR, file);
  const raw = readFileSync(srcPath, "utf8");
  const hash = sha256(raw);

  if (!FORCE && manifest[slug] === hash && existsSync(dstPath)) {
    skipped++;
    continue;
  }

  console.log(`[translate] ${slug}`);
  try {
    const out = await translatePost(raw, slug);
    writeFileSync(dstPath, out, "utf8");
    manifest[slug] = hash;
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
    writeFileSync(TAGS_MAP_PATH, JSON.stringify(tagsMap, null, 2), "utf8");
    translated++;
  } catch (err) {
    failed++;
    console.error(`[translate]   FAILED ${slug}: ${err.message || err}`);
    // On 401/403, bail out — token is wrong, no point continuing.
    if (String(err.message || "").match(/\b(401|403)\b/)) {
      console.error(
        "[translate] Authentication / permission error — stopping. Add 'Workers AI: Read' to your CF API token and re-run."
      );
      break;
    }
  }
}

console.log(
  `[translate] done. translated=${translated} skipped=${skipped} failed=${failed}`
);

// Non-zero exit if any post failed but we don't want to fail the whole
// build (so the site still ships). If CI wants strict mode, run with
// --strict.
if (failed > 0 && process.argv.includes("--strict")) {
  process.exit(1);
}

// ---------- helpers ----------

function sha256(s) {
  return createHash("sha256").update(s).digest("hex");
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) throw new Error("no frontmatter");
  const fmText = m[1];
  const body = m[2];
  const fm = {};
  for (const line of fmText.split(/\r?\n/)) {
    const match = line.match(/^(\w[\w-]*):\s*(.*)$/);
    if (match) fm[match[1]] = match[2];
  }
  return { fmText, fm, body };
}

/**
 * Translate a single post end-to-end. Produces a new markdown file
 * whose frontmatter mirrors the original plus an English title, and
 * whose body is translated.
 */
async function translatePost(raw, slug) {
  const { fmText, fm, body } = parseFrontmatter(raw);

  // 1) Title
  const origTitle = (fm.title || slug).replace(/^["']|["']$/g, "").trim();
  const titleEn = (await translateText(origTitle, "title")).trim();

  // 2) Tags — look up in persistent map, translate any new ones.
  const origTagsLine = fmText.match(/\ntags:\s*\[([^\]]*)\]/);
  // Tags may be YAML list — handle both "[a, b]" inline and multiline.
  const origTags = extractTagsFromFrontmatter(fmText);
  const tagsEn = [];
  for (const t of origTags) {
    if (!tagsMap[t]) {
      tagsMap[t] = (await translateText(t, "tag")).trim();
    }
    tagsEn.push(tagsMap[t]);
  }

  // 3) Body — chunked
  const bodyEn = await translateBody(body);

  // 4) Rebuild frontmatter
  const dateLine = (fm.date || "").toString();
  const origSlug = slug;
  const draftLine = fm.draft || "false";
  const legacy = fm.legacyDir ? `\nlegacyDir: ${fm.legacyDir}` : "";
  const newFm = [
    `title: ${quoteYaml(titleEn)}`,
    dateLine ? `date: ${dateLine}` : "",
    `tags: [${tagsEn.map(quoteYaml).join(", ")}]`,
    `draft: ${draftLine}`,
    `origSlug: ${origSlug}`,
    legacy.trim(),
  ]
    .filter(Boolean)
    .join("\n");

  return `---\n${newFm}\n---\n${bodyEn.trim()}\n`;
}

function extractTagsFromFrontmatter(fmText) {
  // Inline form: tags: [a, b, c]
  const inline = fmText.match(/\ntags:\s*\[([^\]]*)\]/);
  if (inline) {
    return inline[1]
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  }
  // Multiline form:
  //   tags:
  //     - foo
  //     - bar
  const ml = fmText.match(/\ntags:\s*\n((?:\s*-\s*.+\n?)+)/);
  if (ml) {
    return ml[1]
      .split(/\r?\n/)
      .map((l) => l.match(/^\s*-\s*(.+?)\s*$/))
      .filter(Boolean)
      .map((m) => m[1].replace(/^["']|["']$/g, ""));
  }
  return [];
}

function quoteYaml(v) {
  const s = String(v);
  if (/[:#\[\]{}&*!|>'"%@,`?]/.test(s) || /^\s|\s$/.test(s)) {
    return `"${s.replace(/"/g, '\\"')}"`;
  }
  return s;
}

/**
 * Translate a markdown body, chunking on blank lines so individual
 * requests stay inside the model's output budget.
 */
async function translateBody(body) {
  if (body.length <= CHUNK_CHAR_LIMIT) {
    return translateText(body, "body");
  }
  const paragraphs = body.split(/\n\n+/);
  const chunks = [];
  let current = "";
  for (const p of paragraphs) {
    if (current && (current.length + p.length + 2) > CHUNK_CHAR_LIMIT) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) chunks.push(current);

  const out = [];
  for (let i = 0; i < chunks.length; i++) {
    process.stdout.write(`  chunk ${i + 1}/${chunks.length}\r`);
    out.push(await translateText(chunks[i], "body"));
  }
  process.stdout.write("\n");
  return out.join("\n\n");
}

function userPrompt(kind, text) {
  if (kind === "title") {
    return `Translate this Chinese blog post title to a concise, natural English title. Return only the title, no quotes.\n\n${text}`;
  }
  if (kind === "tag") {
    return `Translate this Chinese blog tag to a short natural English tag (1-3 words, title-case). Return only the tag.\n\n${text}`;
  }
  return `Translate the following Chinese blog post content (markdown) to English.\n\n${text}`;
}

async function translateText(text, kind) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await callAI(text, kind);
    } catch (err) {
      lastErr = err;
      // 401/403 — no permission; bail immediately.
      if (/\b(401|403)\b/.test(err.message || "")) throw err;
      // Backoff on 429 / 5xx.
      const delay = 1500 * 2 ** attempt;
      console.warn(
        `[translate]   retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms: ${err.message}`
      );
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function callAI(text, kind) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/ai/run/${MODEL}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt(kind, text) },
      ],
      max_tokens: MAX_TOKENS,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`CF AI ${res.status}: ${body.slice(0, 400)}`);
  }
  const data = await res.json();
  if (!data.success) {
    throw new Error(
      `CF AI error: ${JSON.stringify(data.errors || data).slice(0, 400)}`
    );
  }
  const out = data.result?.response;
  if (typeof out !== "string" || !out.trim()) {
    throw new Error("empty response from AI");
  }
  // Models sometimes wrap output in code fences; strip one leading/trailing
  // fence if it wraps the whole thing.
  const trimmed = out.trim();
  const fenced = trimmed.match(/^```(?:\w+)?\n([\s\S]*)\n```$/);
  return fenced ? fenced[1] : trimmed;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
