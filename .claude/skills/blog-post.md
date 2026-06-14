# Blog Post Writing Skill

撰写及润色博客文章时遵循以下规范。

## Frontmatter

```yaml
---
title: "文章标题"
author: "random25160765"          # 可选，默认取 site.author
description: "文章摘要，用于 SEO 和社交卡片"
pubDatetime: 2026-06-15T12:00:00Z  # 必填，ISO 8601 格式
modDatetime: 2026-06-20T08:00:00Z  # 可选，修改时添加
tags:                               # 可选，默认 ["others"]
  - tag1
  - tag2
featured: false                     # 可选，是否在首页精选展示
draft: false                        # 可选，true 则隐藏不发布
slug: custom-slug                   # 可选，不填则从文件名自动生成
ogImage: /assets/images/cover.jpg   # 可选，社交分享图
---
```

**注意**：
- 只有 `title`、`description`、`pubDatetime` 是必填的
- 时间使用 ISO 8601 格式：`2026-06-15T12:00:00Z`
- 如果文章被翻译/转载到其他平台，用 `canonicalURL` 指向原始链接

## 文件规则

- 放在 `src/content/posts/` 下
- 纯 Markdown 用 `.md`，需要引入 Astro 组件时用 `.mdx`
- 文件名用 kebab-case：`my-new-post.md`
- 目录名前缀 `_` 表示该目录不参与路由：
  - `posts/_releases/xxx.md` → URL 为 `/posts/xxx`
  - `posts/examples/xxx.md` → URL 为 `/posts/examples/xxx`
- 草稿文章：直接在 frontmatter 设置 `draft: true` 即可，无需特殊命名

## 正文规范

### 标题
`title` 是 h1，正文从 h2（`##`）开始，不要用 h1。

### 目录
在需要的位置插入：
```md
## Table of contents
```

### 代码块
支持 Shiki 语法高亮：
```md
​```ts file="src/config.ts"
const foo = "bar";
​```
```

Diff 标注：
```md
​```ts
const old = "removed"; // [!code --]
const New = "added";   // [!code ++]
const key = "highlighted"; // [!code highlight]
​```
```

### Callout 提示框
```md
> [!NOTE]
> 补充说明内容。

> [!WARNING] 自定义标题
> 警告内容。

> [!TIP]+ 默认展开
> 可折叠但默认展开。

> [!DANGER]- 默认折叠
> 点击才展开。
```

支持类型：`NOTE`、`ABSTRACT`、`INFO`、`TODO`、`TIP`、`SUCCESS`、`QUESTION`、`WARNING`、`FAILURE`、`DANGER`、`BUG`、`EXAMPLE`、`QUOTE`

### 图片
```md
![alt](@/assets/images/example.jpg)     # 自动优化，用这个
![alt](/assets/images/example.jpg)       # 不优化，放 public/
```

带标题的图片：
```html
<figure>
  <img src="@/assets/images/example.jpg" alt="描述" />
  <figcaption>图片说明文字</figcaption>
</figure>
```

### 表格
在 `.mdx` 文件中可使用响应式表格组件：
```astro
import ResponsiveTable from "@/components/ResponsiveTable.astro";

<ResponsiveTable variant="striped-minimal">
  | 列1 | 列2 |
  |-----|-----|
  | 值  | 值  |
</ResponsiveTable>
```

### 流程图 / 图表

**默认使用 D2**，不要用 Mermaid。原因：Mermaid 需要浏览器端 JS 渲染（依赖 CDN，网络不通），而 D2 在构建时通过 `remark-d2` 插件直接渲染为 SVG。

````md
```d2
direction: right

vpu: VPU / QEMU 设备
vpu -> fast: fast_ring
fast: "fast_fd\n指令 trace 高频"
fast -> probe
probe: "Unix Socket\nprobe.c"
```
````

**Mermaid 转换规则**：如果原始内容包含 Mermaid 图表，应转换为 D2 格式再写入文章。基本映射：

| Mermaid | D2 |
|---------|-----|
| `flowchart LR` | `direction: right` |
| `A[Label]` | `a: Label` |
| `A -->|label| B` | `a -> b: label` |
| `A["multi<br/>line"]` | `a: "multi\nline"` |
| `A --> B` + `B --> C` | `a -> b -> c` |

常用 D2 写法：
```d2
direction: right

# 节点定义
a: Node A
b: Node B {
  shape: class     # 矩形框
}

# 连接
a -> b: edge label
a -> c: { label: "multi\nline" }

# 方向
a -> b              # 右
a -- b              # 无方向
```

## 常用命令

```bash
pnpm dev          # 本地预览 → http://localhost:4321
pnpm build        # 构建（检查 + 打包 + pagefind 索引）
pnpm format       # 格式化代码
pnpm lint         # ESLint 检查
```
