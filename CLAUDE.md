# CLAUDE.md

这份文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指引。

## 概述

基于 [AstroPaper v6](https://github.com/satnaing/astro-paper) 的个人技术博客，域名为 `random25160765-collab.github.io`。内容以中文为主，主题围绕 GPGPU 模拟、QEMU、RISC-V、性能优化等。

## 技术栈

- **框架**: Astro v6 + Tailwind CSS v4 + TypeScript
- **包管理**: pnpm 11
- **内容**: Markdown / MDX（`src/content/posts/`）
- **搜索**: PageFind（构建时生成静态索引）
- **图表**: D2（构建时渲染为 SVG，无需浏览器端 JS）
- **部署**: GitHub Actions → GitHub Pages（`dist/` 目录）

## 项目结构

```
astro-paper.config.ts   # 站点统一配置（标题、作者、分页、社交链接、功能开关等）
astro.config.ts         # Astro 构建配置（插件、字体、Markdown 处理器）
src/
  content/
    posts/              # 博客文章 (.md / .mdx)
    pages/              # 独立页面（关于页等）
  components/           # 全局可复用组件（ResponsiveTable 等）
  layouts/              # 页面布局（Layout.astro, PostLayout.astro）
  pages/                # Astro 页面路由
  styles/
    global.css          # 全局样式 + Tailwind 入口
    theme.css           # 明暗主题的 CSS 变量（7 个颜色 token）
    typography.css      # 文章排版样式（代码块、callout、D2 图表等）
  i18n/lang/            # 国际化字符串（zh-CN, en）
  assets/
    fonts/              # 本地字体文件（Inter + Noto Sans SC）
    images/             # 需要 Astro 优化的图片
```

## 常用命令

```bash
pnpm dev          # 本地预览 → http://localhost:4321
pnpm build        # 生产构建 → dist/
pnpm format       # Prettier 格式化
pnpm lint         # ESLint 检查
```

## 内容创作

### Skills（项目级）

| Skill | 用途 | 调用方式 |
|---|---|---|
| `/blog-post` | 格式检查与适配：按 AstroPaper 全部格式能力（frontmatter、callout、D2、代码块、ResponsiveTable 等）规范化文章 | `/blog-post 检查这篇文章` |
| `/blog-polish` | 内容润色：从代码验证、组织结构、叙事节奏、概念提炼四个维度，把"项目记录"提升为"可迁移的教学文本" | `/blog-polish 润色这篇文章` |

### 写文章时 agent 会自动参考

- `.claude/skills/blog-post.md` — 完整的格式参考手册（frontmatter 字段、callout 类型、D2 语法、MDX 用法等）
- `_reference/` — AstroPaper 官方参考文档和示例文章

## 部署

推送到 `main` 分支自动触发 GitHub Actions：

1. `pnpm install --frozen-lockfile`
2. `pnpm build`（含 D2 图表渲染 + PageFind 索引生成）
3. 上传 `dist/` 到 GitHub Pages

提交信息末尾添加：`Assisted by: Claude Code + Deepseek v4 Pro`
