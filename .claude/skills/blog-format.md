---
name: blog-format
description: 将 raw 博客草稿格式化为 AstroPaper v6 网页适配文本（frontmatter、代码块、callout、D2、表格、图片等）。
---

# Blog Formatting Skill

将 raw 博客草稿按 AstroPaper v6 框架的格式能力规范化。本 skill 是**纯格式参考手册** — 只关心"应该用什么语法、怎么写才对"，不涉及内容质量和润色。

---

## Frontmatter

每篇文章顶部的 YAML 元数据块。完整字段如下：

```yaml
---
title: "文章标题"                  # 必填。同时是 h1 标题和 SEO title
description: "文章摘要"            # 必填。用于 SEO description 和社交卡片
pubDatetime: 2026-06-14T12:00:00Z  # 必填。ISO 8601 格式，必须 ≤ 昨天
author: "作者名"                   # 可选。默认取 site.author
modDatetime: 2026-06-20T08:00:00Z  # 可选。文章修改时添加
tags:                               # 可选。默认 ["others"]
  - tag1
  - tag2
featured: false                     # 可选。true 则在首页精选区展示
draft: false                        # 可选。true 则构建时跳过（不发布）
slug: custom-slug                   # 可选。不填则从文件名自动生成
ogImage: /assets/images/cover.jpg   # 可选。社交分享图（可用本地路径或远程 URL）
canonicalURL: https://...           # 可选。文章已在其他平台发布时，指向原始链接
hideEditPost: false                 # 可选。true 则隐藏文章页的"编辑此页"按钮
timezone: "Asia/Shanghai"           # 可选。覆盖 site.timezone，仅影响本篇文章的时间显示
---
```

**要点：**
- 只有 `title`、`description`、`pubDatetime` 必填
- `pubDatetime` 必须设为**至少昨天**的日期。静态站点只在构建时决定文章可见性——`pubDatetime` 晚于构建时间则文章不会出现在线上
- `modDatetime` 只在文章内容有实质修改时添加
- `tags` 不填时默认为 `["others"]`，可在 `src/content.config.ts` 中修改默认值
- `ogImage` 支持三种方式：①本地路径（相对于当前文件目录或 `@/assets/` 别名）；②远程 URL；③不填则由 `dynamicOgImage` 自动生成
- `canonicalURL` 用于声明原始出处，避免 SEO 重复内容惩罚
- 时间统一使用 UTC 时区（Z 后缀），显示时由 `timezone` 自动转换

---

## 文件组织

### 存放位置
文章放在 `src/content/posts/` 下，支持子目录：

| 文件路径 | 生成的 URL |
|---|---|
| `posts/my-post.md` | `/posts/my-post` |
| `posts/2026/my-post.md` | `/posts/2026/my-post` |
| `posts/_drafts/my-post.md` | `/posts/my-post`（`_` 目录不参与路由） |
| `posts/docs/_legacy/how-to.md` | `/posts/docs/how-to` |

### 命名规则
- 文件名用 **kebab-case**：`my-new-post.md`
- `_` 前缀的**目录**不参与路由——用于组织共享资源、草稿素材
- `_` 前缀的**文件**同理，不会生成页面
- 纯文字内容用 `.md`；需要导入组件时用 `.mdx`

### 草稿
直接在 frontmatter 设置 `draft: true`，无需特殊命名或移动目录。草稿文章在 `pnpm dev` 中可见，`pnpm build` 时排除。

---

## 内容格式

### 标题层级

`title` 是 h1。正文从 **h2（`##`）**开始，不要再用 h1。推荐使用 h2～h4，h5/h6 在正文中极少用到。

### 目录

在需要的位置插入以下内容，`remark-toc` 插件会自动生成目录列表：

```md
## 目录

<!-- 或者用英文 -->
## Table of contents
```

两种写法等效——中文文章用 `## 目录`，英文文章用 `## Table of contents`。`remark-collapse` 插件会将 TOC 渲染为可折叠的 `<details>` 元素。

---

### MDX 与 Markdown 的选择

| 需求 | 格式 |
|---|---|
| 纯文字、代码块、callout、D2 图表 | `.md` |
| 需要导入 Astro/React 组件 | `.mdx` |
| 需要使用 `ResponsiveTable` 组件 | `.mdx` |
| 需要使用 JSX 表达式（`{variable}`） | `.mdx` |
| 需要 `import` 图片并用 `Image` 组件优化 | `.mdx` |

**`.mdx` 中的典型用法：**

```mdx
---
title: "文章标题"
---
import ResponsiveTable from "@/components/ResponsiveTable.astro";
import { Image } from "astro:assets";
import myImage from "@/assets/images/example.png";

## 正文

<ResponsiveTable variant="striped">
  | 列1 | 列2 |
  |-----|-----|
  | 值  | 值  |
</ResponsiveTable>

<Image src={myImage} alt="示例图" class="rounded-lg" />
```

---

### 代码块

#### 基本语法高亮

使用 Shiki 作为语法高亮引擎。指定语言即可：

````md
```ts
const foo: string = "bar";
```
````

#### 文件名标注

使用 `file=` 属性给代码块添加文件名头（由 `transformerFileName` 渲染）：

````md
```ts file="src/config.ts"
export const SITE = { ... };
```

```c file="core/engine.c"
#define NEXT() do { goto *ip++->handler; } while (0)
```
````

所有引用真实文件的代码块都应使用 `file=` 属性，方便读者定位。

#### Diff 与高亮标注

支持三种行内标注（由 `@shikijs/transformers` 驱动）：

````md
```ts
const old = "removed";        // [!code --]
const New = "added";          // [!code ++]
const key = "highlighted";    // [!code highlight]
const word = "focus";         // [!code word:focus]
```
````

- `// [!code --]` — 删除行（红色背景 + `-` 前缀）
- `// [!code ++]` — 新增行（绿色背景 + `+` 前缀）
- `// [!code highlight]` — 高亮整行
- `// [!code word:xxx]` — 高亮行内指定词

#### 无语言标注

纯文本输出（如日志、ASCII 流程图）用 `text` 或不标注语言：

````md
```text
qemu_log("trace message\n");
```

```
ASCII flow diagram
```
````

---

### Callout 提示框

Callout 由 `rehype-callouts` 插件渲染，使用 blockquote 语法。

#### 基本用法

```md
> [!NOTE]
> 补充说明内容。
```

#### 支持的类型

| 类型 | 用途 | 别名 |
|---|---|---|
| `NOTE` | 补充信息 | — |
| `INFO` | 中性信息 | — |
| `TODO` | 待办事项 | — |
| `TIP` | 建议/技巧 | `HINT`, `IMPORTANT` |
| `SUCCESS` | 成功/正确 | `DONE`, `CHECK` |
| `QUESTION` | 问题/疑问 | `HELP`, `FAQ` |
| `WARNING` | 警告/注意 | `CAUTION`, `ATTENTION` |
| `FAILURE` | 失败/错误 | `FAIL`, `MISSING` |
| `DANGER` | 危险/严重 | `ERROR` |
| `BUG` | Bug 相关 | — |
| `EXAMPLE` | 示例 | — |
| `QUOTE` | 引用 | `CITE` |
| `ABSTRACT` | 摘要 | `SUMMARY`, `TLDR` |

#### 自定义标题

类型后面直接写文字即可：

```md
> [!NOTE] 主要贡献者
> - 作者：@username

> [!WARNING] 踩坑记录
> 这段内容记录遇到的具体问题。
```

#### 折叠语法

在类型后添加 `-`（默认折叠）或 `+`（默认展开）：

```md
> [!NOTE]- 更多优化手段（默认折叠）
> 点击展开查看详细内容。

> [!TIP]+ 默认展开
> 读者第一眼就能看到，但可以手动折叠。
```

---

### 图片

#### 自动优化（推荐）

图片放在 `src/assets/` 目录下，Astro 自动进行格式转换、压缩和响应式处理。使用 `@/assets/` 别名引用：

```md
![alt](@/assets/images/example.jpg)
```

#### 不优化

图片放在 `public/` 目录下，保持原样。用绝对路径引用：

```md
![alt](/assets/images/example.jpg)
```

#### 带标题的图片

```html
<figure>
  <img src="@/assets/images/example.jpg" alt="描述" />
  <figcaption class="text-center">图片说明文字</figcaption>
</figure>
```

> 如果图片需要用到 Astro 的 `Image` 组件做进一步优化，必须使用 `.mdx` 格式：
> ```mdx
> import { Image } from "astro:assets";
> import hero from "@/assets/images/hero.png";
>
> <figure>
>   <Image src={hero} alt="封面" />
>   <figcaption class="text-center">封面图</figcaption>
> </figure>
> ```

#### OG 图片建议

- 推荐尺寸：**1200 × 640** px
- 放在 `src/assets/images/` 下，在 frontmatter 中引用
- 不填则启用 `dynamicOgImage` 自动生成（默认开启）

---

### 流程图 / 图表

**统一使用 D2**，不要用 Mermaid。原因：D2 在构建时通过 `remark-d2` 插件直接渲染为 SVG，无需浏览器端 JS（不依赖 CDN）。

#### 基本语法

````md
```d2
direction: right

# 节点定义
a: Node A {
  shape: class
}
b: "Node B\n多行文字"

# 连接
a -> b: edge label
a -> c -> d          # 链式连接
a -- b                # 无方向连接

# 分组
group: My Group {
  a
  b
}
```
````

#### D2 速查

| 功能 | 语法 |
|---|---|
| 方向 | `direction: right` / `down` / `left` / `up` |
| 矩形节点 | `id: Label { shape: class }` |
| 圆角节点 | `id: Label { shape: rectangle }` |
| 多行文字 | `id: "line1\nline2"` |
| 带标签的连接 | `a -> b: label` |
| 多标签连接 | `a -> b: { label: "multi\nline" }` |
| 无方向连接 | `a -- b` |
| 样式 | `a.style.fill: "#ff6b01"` |
| 注释 | `# 这是注释` |

#### 从 Mermaid 转换

如果遇到已有的 Mermaid 图表，按以下映射转换为 D2：

| Mermaid | D2 |
|---|---|
| `flowchart LR` | `direction: right` |
| `A[Label]` | `a: Label` |
| `A -->\|label\| B` | `a -> b: label` |
| `A["multi<br/>line"]` | `a: "multi\nline"` |
| `A --> B --> C` | `a -> b -> c` |

---

### LaTeX 数学公式

行内公式用单 `$`，块级公式用双 `$$`：

```md
行内：$E = mc^2$

块级：
$$ \int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi} $$

多行：
$$
\begin{aligned}
\nabla \cdot \mathbf{E} &= \frac{\rho}{\varepsilon_0} \\
\nabla \cdot \mathbf{B} &= 0
\end{aligned}
$$
```

> **注意：** 标题中包含非拉丁字符时，需确保 `astro.config.ts` 中的字体覆盖对应字符集，并包含 400 和 700 两个 weight（Satori 渲染 OG 图片需要）。

---

### 表格

#### 普通 Markdown 表格

适用于简单数据、移动端无关紧要的场景：

```md
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 值  | 值  | 值  |
```

#### 响应式表格（需要 `.mdx`）

在 `.mdx` 文件中可使用 `ResponsiveTable` 组件，移动端自动横向滚动：

```mdx
import ResponsiveTable from "@/components/ResponsiveTable.astro";

<ResponsiveTable variant="striped-minimal">
  | 属性 | 说明 | 备注 |
  |------|------|------|
  | title | 文章标题 | 必填 |
  | tags | 标签列表 | 可选 |
</ResponsiveTable>
```

**`variant` 选项：**

| variant | 效果 |
|---|---|
| （不填） | 带边框的标准表格 |
| `"minimal"` | 无边框 |
| `"striped"` | 隔行着色 + 边框 |
| `"striped-minimal"` | 隔行着色，无边框 |

---

### 链接

```md
[内链文字](/posts/some-post)        # 站内链接用绝对路径
[外链文字](https://example.com)      # 站外链接用完整 URL
```

---

## 格式检查清单

- [ ] `pubDatetime` ≤ 昨天
- [ ] 正文没有 h1（只有 frontmatter `title` 是 h1）
- [ ] 代码块引用真实文件的都加了 `file=` 属性
- [ ] 流程图/图表使用 D2 格式（不是 Mermaid）
- [ ] 图片放在了 `src/assets/` 下（而非 `public/`）
- [ ] callout 类型首字母大写（`> [!NOTE]` 不是 `> [!note]`）
- [ ] `pnpm build` 通过

---

## 常用命令

```bash
pnpm dev          # 本地预览 → http://localhost:4321
pnpm build        # 构建（检查 + 打包 + pagefind 索引）
pnpm format       # 格式化代码
pnpm lint         # ESLint 检查
```
