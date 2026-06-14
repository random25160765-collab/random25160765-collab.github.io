# random25160765

我的个人博客，基于 [AstroPaper](https://github.com/satnaing/astro-paper) 主题搭建，托管在 GitHub Pages。

## 本地开发

```bash
pnpm install      # 安装依赖
pnpm dev          # 启动开发服务器 → http://localhost:4321
pnpm build        # 构建生产版本
pnpm preview      # 本地预览构建结果
```

## 添加文章

在 `src/content/posts/` 目录下新建 `.md` 或 `.mdx` 文件，文件头需要包含以下 frontmatter：

```md
---
title: "文章标题"
author: "random25160765"
description: "文章摘要"
pubDate: 2026-06-15
tags: ["tag1", "tag2"]
---

文章正文...
```

## 部署

推送到 `main` 分支，GitHub Actions 自动构建并部署到 GitHub Pages。
