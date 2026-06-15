# CLAUDE.md

这份文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指引。

## 概述

基于 [AstroPaper v6](https://github.com/satnaing/astro-paper) 的个人技术博客，域名为 `random25160765-collab.github.io`。

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
| `/blog-format` | 格式规范化：按 AstroPaper v6 全部格式能力（frontmatter、callout、D2、代码块、ResponsiveTable 等）将 raw 草稿转为网页适配文本 | `/blog-format 格式化这篇文章` |
| `/blog-post` | 发布前内容审阅：从准确、减法、结构、叙事节奏、读者视角五个维度检查文章是否"能让人高效理解" | `/blog-post 审阅这篇文章` |
| `/blog-polish` | 内容润色：从代码验证、组织结构、叙事节奏、概念提炼四个维度，把"项目记录"提升为"可迁移的教学文本" | `/blog-polish 润色这篇文章` |
| `/blog-mdx` | MDX 组件增强：仅在纯文字/静态图表无法高效传达概念时，为文章添加交互式组件（Tabs、带标注的图表、运行时 demo 等） | `/blog-mdx 给这篇文章加组件` |

### 写文章时 agent 会自动参考

- `.claude/skills/blog-format.md` — 完整的格式参考手册（frontmatter 字段、callout 类型、D2 语法、MDX 用法等）
- `.claude/skills/blog-post.md` — 内容审阅指南（准确、减法、结构、叙事节奏的核心原则和检查清单）
- `_reference/` — AstroPaper 官方参考文档和示例文章

## Commit 规范

### 格式

```
<type>: <subject>

<body>
<footer>
```

### Type 前缀

| Type | 用途 |
|---|---|
| `feat` | 新功能（文章、组件、配置项等） |
| `fix` | 修复 bug（链接、渲染、构建错误等） |
| `docs` | 文档 / skill / CLAUDE.md 更新 |
| `style` | 格式调整（不影响功能） |
| `refactor` | 重构（不改行为） |
| `chore` | 杂项（依赖更新、CI 调整） |

### 规则

- **subject 用英文**，50 字符以内，祈使语气（`add` 不是 `added`）
- **body 用中文**，解释做了什么、为什么。可以用 `-` 列举要点
- **footer** 固定写：`Assisted by: Claude Code + Deepseek v4 Pro`
- 文章本身的内容修改使用 `feat:`，格式适配用 `style:`，skill/docs 用 `docs:`

### 示例

```
feat: add vortex-1 simx source code analysis post

Vortex SimX 仿真引擎基础框架源码解读，包含 SimObject、SimPort、 SimEvent 和 SimPlatform 的设计分析。

Assisted by: Claude Code + Deepseek v4 Pro
```

```
style: normalize callout formatting and heading levels in vortex-1

按 blog-post skill 规范：callout 类型统一大写、h1→h2、添加 file= 属性。

Assisted by: Claude Code + Deepseek v4 Pro
```

## 部署

推送到 `main` 分支自动触发 GitHub Actions：

1. `pnpm install --frozen-lockfile`
2. `pnpm build`（含 D2 图表渲染 + PageFind 索引生成）
3. 上传 `dist/` 到 GitHub Pages
