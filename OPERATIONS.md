# 运维手册 — quake0day.com (PSYcHiC)

> Obsidian 写作 → git push → 网站自动更新。不再碰服务器,不再手动部署。

## 一眼看懂的架构

```
┌─ Obsidian (本地 vault = ~/my_blog 仓库根目录) ─────────────────┐
│  你在 Obsidian 里写 / 改 markdown                              │
│    ↓                                                            │
│  Obsidian Git plugin(每 30 分钟 OR 保存后 N 秒)              │
│    auto commit + auto push                                      │
└───────────────────────────┬────────────────────────────────────┘
                            ▼
┌─ GitHub quake0day/blog (main) ──────────────────────────────────┐
│  唯一真相源                                                      │
└───────────────────────────┬────────────────────────────────────┘
                            ▼
┌─ GitHub Actions: .github/workflows/deploy.yml ──────────────────┐
│  每次 push → pnpm install → pnpm build → wrangler pages deploy   │
│  用 CLOUDFLARE_API_TOKEN (Pages:Edit) + CLOUDFLARE_ACCOUNT_ID    │
└───────────────────────────┬────────────────────────────────────┘
                            ▼
┌─ Cloudflare ────────────────────────────────────────────────────┐
│  Pages "quake0day-blog"                                          │
│  ├─ quake0day.com (custom domain)                                │
│  └─ www.quake0day.com                                            │
│  R2 "quake0day-blog-assets" ──► pub-fb906...r2.dev               │
│     └─ cycm.mp4 (164MB, CF Pages 单文件限 25MiB 装不下)          │
└──────────────────────────────────────────────────────────────────┘
```

**总延迟:保存到线上约 30-90 秒**(Obsidian Git push 5s + GH Action build+deploy 60s 左右)。

---

## 首次设置(一次性,照着做)

### 1. 在 Cloudflare 创建 API Token

去 https://dash.cloudflare.com/profile/api-tokens → **Create Token** → 自定义(Custom token):

| 字段 | 填 |
|---|---|
| Permissions | `Account` → `Cloudflare Pages` → **Edit** |
| Account Resources | Include → `Quake0day@gmail.com's Account` |
| Token name | `github-actions-pages-deploy` |

Continue → Create Token → **复制显示的 token**(形如 `cfut_xxxxxxx`,只显示一次)。

### 2. 把 Token 加到 GitHub Secrets

```fish
echo "cfut_粘贴你刚才复制的token" | gh secret set CLOUDFLARE_API_TOKEN --repo quake0day/blog
```

验证:

```fish
gh secret list --repo quake0day/blog
# 应该看到 CLOUDFLARE_ACCOUNT_ID 和 CLOUDFLARE_API_TOKEN 两个
```

### 3. 切 DNS(quake0day.com 从 Linode → CF Pages)

OAuth token 没 DNS:edit 权限,这步要你在 dashboard 手动:

1. https://dash.cloudflare.com/ → 选 `quake0day.com` zone → **DNS → Records**
2. 删掉 `@` (或 `quake0day.com`) 的 A 记录(现在指向 `66.228.60.54` 的那条)
3. 删掉 `www` 的 A/CNAME 记录(如果有)
4. Cloudflare 通常会在删完之后**自动代理** Pages 的 CNAME;如果没自动加,手动:
   - `quake0day.com CNAME quake0day-blog.pages.dev` 橙云 proxied
   - `www.quake0day.com CNAME quake0day-blog.pages.dev` 橙云 proxied

30 秒内 DNS 生效,Pages 自动签 SSL。

### 4. Obsidian vault 设置

**前置**:本地 clone 已经在 `~/my_blog`。

1. 打开 Obsidian → **Open folder as vault** → 选 `/Users/quake0day/my_blog`
   - 或者只把 `src/content/posts` 作为 vault——但建议整个仓库,可以顺便编辑配置
2. Settings → Community plugins → **Turn on community plugins** → Browse
3. 搜 "**Obsidian Git**"(by Vinzent)→ Install → Enable
4. Obsidian Git 配置(Settings → Obsidian Git):
   - Vault backup interval (minutes): `30`(每 30 分钟自动提交 + push)
   - Auto push: `enabled`
   - Auto pull: `enabled`(防止多设备冲突)
   - Commit message: `{{date}} {{numFiles}} files`
5. 重启 Obsidian

从此:
- 在 Obsidian 里新建 / 改 `.md` → **保存**
- 最多 30 分钟内 → 自动 commit & push
- GH Actions 跑 → 30-60 秒后 `quake0day.com` 更新

### 5. (可选)加快发布:Ctrl+P → "Obsidian Git: Commit-and-sync"

手动触发即刻 commit + push,不用等 30 分钟。

---

## 日常:写新文章

1. 在 Obsidian vault 里,创建 `src/content/posts/<YYYY-MM-DD-slug>.md`
2. 文件开头写 frontmatter:

   ```markdown
   ---
   title: 这篇博客的标题
   date: 2026-04-20T10:00:00+00:00
   tags:
     - 日记
     - 技术思考
   draft: false
   ---
   
   # 正文开始
   
   这里是正文……可以用所有标准 markdown + 代码块。
   ```

3. 保存。Obsidian Git 30 分钟内推送 → 网站 30-60 秒后更新 → `https://quake0day.com/post/<YYYY-MM-DD-slug>`

## 日常:改旧文章

Obsidian 里打开 `src/content/posts/<file>.md`,改,保存,等推送。

**不要改 `slug`(没这字段),不要改文件名**——这会导致 URL 变化,旧链接 404。

## 日常:发草稿

frontmatter 里 `draft: true` → 这篇文章不构建,不显示。改成 `draft: false` 才上线。

## 日常:上大文件(>24MB,比如视频)

CF Pages 单文件限 25 MiB,大文件走 R2。例子(视频):

```fish
# 假设 my-video.mp4 是 200MB
cd ~/my_blog
# 放进 git(保留备份)
cp ~/Downloads/my-video.mp4 public/static/file/

# 同时推到 R2
npx wrangler r2 object put "quake0day-blog-assets/my-video.mp4" \
  --file=public/static/file/my-video.mp4 \
  --content-type=video/mp4 --remote

# 正文里引用 R2 URL(不是 /static/file/,那个 deploy 会被过滤掉):
# ![](https://pub-fb90622ae5984bada3a2e68f2527000b.r2.dev/my-video.mp4)
```

部署脚本 `publish:cf` 和 GH Action 都会自动把 dist/ 里 >24MB 的文件删掉再推,所以 public/static/ 里留原件是安全的。

---

## 部署机制

### 自动(主流)

- 任何 push 到 `main` → GitHub Action 自动 build+deploy
- 看状态: https://github.com/quake0day/blog/actions
- Action 跑约 60-90 秒完成

### 手动(紧急 / 跳过 GH Action)

```fish
cd ~/my_blog
pnpm run publish:cf   # 本地 build + 过滤大文件 + wrangler pages deploy
```

需要本地 wrangler 已登录(`npx wrangler whoami` 看得到账号就 OK)。

---

## 旧链接兼容

所有老的 `/post/<hex-encoded-chinese>` URL 都在 `public/_redirects` 里 301 到新的 `/post/<chinese>` URL。不用动。

如果有人报老链接 404,检查 `public/_redirects` 有没有那一条。

---

## Disqus 评论

- Shortname: `quakesblog`
- 每篇 post 的 Disqus `identifier` 是它的 **legacyDir** 字段(从旧博客迁过来时写入的 frontmatter),这保证**老评论线程仍然挂在对应帖子下**
- 新文章的 identifier 默认是 slug,新开线程

要关评论 / 换 shortname:改 `src/pages/post/[slug].astro` 里的 Disqus script 块。

---

## 故障排查

### Obsidian Git 不自动 push

- Settings → Obsidian Git → 检查 "Vault backup interval" 不是 0
- 手动触发:Ctrl+P → `Obsidian Git: Commit-and-sync`
- 看错误:Ctrl+P → `Obsidian Git: Open diff view` / 查看日志

### GitHub Action 失败

- 去 https://github.com/quake0day/blog/actions 点失败那次看日志
- 最常见:`CLOUDFLARE_API_TOKEN` 过期或权限不足 → 重新创建 CF token 更新 secret
- 其次:文件超过 25 MiB 漏了过滤 → 检查 `dist` 内容

### 站打开但内容没变

- CF 边缘缓存,通常 1-2 分钟清干净
- hard refresh(⌘⇧R)
- 还不行:确认 GH Action 最新那次是不是 success(见上)

### 某篇旧帖图片挂了

可能是当年在 post 里硬编码了 `http://www.quake0day.com/static/img/xxx.jpg` 的老地址。这些 URL 现在指向新站但 `/static/img/xxx.jpg` 仍然在 `public/static/img/` 里,应该能加载。如果确实 404,用 Ctrl+F 在 Obsidian 里 find-and-replace 链接。

### `pnpm build` 失败 "does not match collection schema"

某篇新建的 post frontmatter 必填字段缺了(title / date)。去 Obsidian 打开那篇 .md 补齐。

---

## 密钥 / 资源台账

| 项 | 作用 | 在哪 |
|---|---|---|
| GitHub Secret `CLOUDFLARE_API_TOKEN` | GH Action 部署权限 | https://github.com/quake0day/blog/settings/secrets/actions |
| GitHub Secret `CLOUDFLARE_ACCOUNT_ID` | 同上(已自动写入) | 同上 |
| Wrangler OAuth(本机 Mac) | `pnpm run publish:cf` 手动部署 | `~/Library/Preferences/.wrangler/config/default.toml`,过期 `npx wrangler login` |
| CF Pages 项目 | `quake0day-blog` | https://dash.cloudflare.com/ → Workers & Pages |
| CF R2 bucket | `quake0day-blog-assets` | 里面只有 `cycm.mp4` 一个文件 |
| CF R2 public base | `https://pub-fb90622ae5984bada3a2e68f2527000b.r2.dev` | 里面所有东西公开可读 |
| Obsidian vault | `/Users/quake0day/my_blog` | 本地 git 仓库同时是 Obsidian vault |

---

## 内容统计

| 指标 | 值 |
|---|---|
| 迁移的旧 post | **119** 篇 (2004-01 → 2025-03) |
| 跳过的空 post | 1 (2025-04-05-LLMandEducattion) |
| Tags 数 | 见 https://quake0day.com/tags |
| 老→新 URL 重定向 | 107 条,在 `public/_redirects` |

---

## 把 Pages 切换到真正的 Git 集成(可选,一劳永逸)

目前我们用"GitHub Action → wrangler direct-upload"模拟 Git 集成,功能相同。如果想用 **CF 原生 Git 集成**(省去 GH Action):

1. 去 https://dash.cloudflare.com/ → Workers & Pages → `quake0day-blog` → **Settings → Builds & deployments** → Source → **Connect to Git**
2. 授权 Cloudflare GitHub App 访问 `quake0day/blog` 仓库
3. 选 branch: `main`,build command: `pnpm install && pnpm build`,output dir: `dist`
4. Save → 之后 push 直接由 CF 构建,不再经过 GH Action

**注意**:切过去之后,可以关掉 `.github/workflows/deploy.yml`(或删掉),避免双重部署。

---

## 老 Linode 清理

`66.228.60.54` 还开着(虽然 HTTP 已挂),**每月 $5**。等 DNS 切到 CF 且观察 1 周无异常后:

```fish
# ssh 进去保险起见把 posts/static 再备份一次到本地
sshpass -p '@Lara4cs' rsync -az -e 'ssh -o StrictHostKeyChecking=no' \
  root@66.228.60.54:/home/quake0day/itsa/ \
  ~/backups/quake0day-linode-final-$(date +%Y%m%d)/

# 然后去 Linode 控制台关机 + 删机器
```

`_legacy/` 里现在也留了一份本地副本,删 Linode 不会丢数据。
