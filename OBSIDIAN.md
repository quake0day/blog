# Obsidian 配置指南

目标:在 Obsidian 里写 markdown → 自动 git push → 60 秒后 quake0day.com 更新。

## 一、装 Obsidian

如果还没装: https://obsidian.md → Download for Mac → 拖进 Applications。

## 二、把仓库打开成 vault

1. 启动 Obsidian
2. 第一个界面点 **"Open folder as vault"**
3. 选 `/Users/quake0day/my_blog`
4. 它会提示 "Trust author and enable plugins" — 选 **Trust**

Obsidian 现在把整个博客仓库当作 vault,你能看到 `src/content/posts/` 里所有 119 篇老文章,以及 `OPERATIONS.md`、`OBSIDIAN.md` 这些文档。

> 如果你只想看到文章、不想看到代码文件: Settings → Files & Links → **Excluded files** 里加
> `dist`、`node_modules`、`_legacy`、`functions`、`src/components`、`src/layouts`、`src/pages`、`src/content/config.ts`、`.github`、`scripts`、`public`

## 三、装 Obsidian Git 插件(最关键)

这是把"保存"变成"自动发布"的那个插件。

1. Settings (⌘,)  → **Community plugins**
2. 页面顶部会提示 "Community plugins are currently off" — 点 **Turn on community plugins**
3. 点 **Browse** → 搜索 `Obsidian Git` (作者 Vinzent)
4. 点 **Install** → **Enable**

装完后左侧栏会多出一个 git 图标。

## 四、配置 Obsidian Git

Settings → **Obsidian Git**,按下面设:

| 选项 | 值 |
|---|---|
| **Vault backup interval (minutes)** | `30` |
| **Auto push after commit** | ✅ 打开 |
| **Auto pull interval (minutes)** | `60`(防多设备写冲突) |
| **Commit message** | `vault backup: {{date}} - {{numFiles}} files` |
| **Date placeholder format** | `YYYY-MM-DD HH:mm:ss` |
| **Pull changes before push** | ✅ |
| **Disable notifications** | 随你(我建议关,不然每 30 分弹一次) |

> 如果之前从没推过 git,插件会提示 "No git user configured" — 点那个提示或去配置:
> **Username**: `Si Chen`
> **Email**: `quake0day@gmail.com`
> (这是 git commit 的署名,不用密码)

## 五、装 Templates 插件(内置,让新文章自动填时间)

这是 Obsidian **自带**的核心插件,不用下载。

1. Settings → **Core plugins** → 启用 **Templates**
2. Settings → **Templates**:
   - **Template folder location**: `_templates`(仓库里已经放好一个)
   - **Date format**: `YYYY-MM-DD`
   - **Time format**: `HH:mm:ss`

## 六、写一篇新文章的流程

### 方法 A:用模板(推荐)
1. 在左侧文件栏,切到 `src/content/posts/` 目录
2. 右键 → **New note**,文件名填 `2026-04-21-测试动态发布`(日期-slug,纯小写 ASCII 加中文都行)
3. 打开这个新文件
4. ⌘P → 搜 **Templates: Insert template** → 选 `新文章` → 插入
5. 模板会自动填好 date 字段(当前时间),改 title 和正文
6. Cmd+S 保存

### 方法 B:直接手写 frontmatter
新建 `.md` 文件,粘贴这段到顶部:

```yaml
---
title: 你的标题
date: 2026-04-21T10:00:00+00:00
tags:
  - 日记
draft: false
---

正文从这里开始。
```

字段说明:
- `title` - 必填,显示在文章页和列表
- `date` - 必填,决定时间排序。ISO 格式(带时区)
- `tags` - 可选,数组,会出现在 `/tags` 和 `/tagged/xxx`
- `draft: true` - **不会发布**,只在本地能看
- **文件名 = 你的 URL 后缀**。规则:日期 + 小写 slug,例如 `2026-04-21-my-post.md` → `quake0day.com/post/2026-04-21-my-post`

## 七、保存即发布的触发路径

```
Ctrl+S(Obsidian 保存文件)
   ↓
30 分钟后 Obsidian Git auto-backup 触发
   ↓
git add . && git commit -m "..." && git push origin main
   ↓
GitHub 收到 push
   ↓
GitHub Actions 的 .github/workflows/deploy.yml 自动触发
   ↓
pnpm install + pnpm build + wrangler pages deploy dist
   ↓
约 60 秒后 quake0day.com 更新
```

总延迟最多 **30 分 + 60 秒**,一般就这个量级。

## 八、不想等 30 分钟?立即发布

Obsidian 里按 ⌘P(命令面板) → 搜 **"Obsidian Git: Commit-and-sync"** → 回车。

立刻 commit + push,60 秒内线上更新。

也可以把这个命令绑快捷键:Settings → **Hotkeys** → 搜 `Commit-and-sync` → 设成 `Cmd+Shift+K` 之类。

## 九、看部署状态

### 在 Obsidian 里直接看?
**GitHub Actions 没办法直接显示在 Obsidian 里**。但你可以:
- 打开 https://github.com/quake0day/blog/actions,看每次 push 跑得怎么样
- 或用 Obsidian 的 Web Viewer 插件做书签

### 失败了怎么知道?
GitHub 会邮件提醒你 action 失败(默认行为,如果想关去 github.com 的设置里)。失败最常见就是 frontmatter 写错(title / date 缺失),打开 Action 日志能看到具体哪一行哪一篇出问题。

## 十、常见问题

### 我在两台电脑都写博客,怎么同步?
两台都 clone 这个 repo → 两台都装 Obsidian + Obsidian Git。
有个注意事项:每次开工前先 **⌘P → Obsidian Git: Pull**,或者依赖插件设置里 "Auto pull interval" 自动拉。

### 忘了写 frontmatter 怎么办?
GitHub Action 构建会失败,站点还是老版本。收到失败邮件后补上 frontmatter,再 push 就好。不影响已有内容。

### 想看某篇 Markdown 在站点上长什么样?
Obsidian 里的预览 ≠ 线上渲染。本地要看真实效果:
```fish
cd ~/my_blog
pnpm dev
# 访问 http://localhost:4321
```

### 写错了想撤销怎么办?
Obsidian Git 插件左侧栏图标点开 → **Source Control** 面板能看 diff → 撤销未提交的改动。已 push 的就 `git revert` 或改回来再 push。

### 我删了一篇文章怎么办?
直接在 Obsidian 里 right-click → Delete note。然后正常 commit + push。站点构建会少那篇,`_redirects` 里的 301 规则也会指向不存在的地方(变成 404 页)。不影响其他文章。

### Tags 怎么加 / 删?
直接改 frontmatter 的 `tags:` 数组。构建时自动重新生成 `/tagged/XX/` 和 `/tags` 页面的计数。

### 能不能让 Obsidian 在保存时**立刻** push,而不是等 30 分钟?
可以,但会频繁触发 GitHub Action(每次保存都跑一次 build)。建议用快捷键手动 **"Commit-and-sync"** 代替。如果坚持要自动化,Obsidian Git 设置里 "Vault backup interval" 改 1 分钟即可。
