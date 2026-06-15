---
name: blog-mdx
description: 为博客文章添加 MDX 交互组件。仅在纯文字/静态图表无法高效传达概念时才使用——不做无意义的"装饰性加强"。
---

# Blog MDX Skill

为博客文章添加 MDX 交互组件。核心原则：**MDX 不是用来让文章"更炫"的，而是当纯文字/静态图表确实无法高效传达某个概念时，提供一种解法。**

## 什么时候不该用 MDX

以下情况直接用 `.md`，不要切 `.mdx`：

- 文章核心是文字叙述，没有天然的"对比"/"交互"/"动态演示"需求
- 纯文字 + 代码块 + D2 图表已经讲清楚了
- "我觉得这里可以加个组件" —— 如果你说不清"没有这个组件，读者会误解/看不懂什么"，就不要加

> [!WARNING] 判断标准
> 对每个想要用 MDX 的地方问自己：**"如果没有这个交互，这个概念读者是不是很难懂？"** 如果答案是"也能懂，只是平平无奇"，就不要加。MDX 是解决问题的工具，不是装饰品。

## 什么时候该用 MDX

以下场景是 MDX 真正发挥价值的地方——每种场景都有明确的"触发条件"。

---

### 场景 1：多版本代码/配置对比

**触发条件**：文章里有一段"优化前"和"优化后"的代码对比，或者两个不同版本的配置/方案需要并列展示，读者来回上下翻很不方便。

**组件**：`Tabs.astro` —— 标签页切换组件，纯 CSS 实现（无 JS 依赖），读者点击标签在同一位置切换内容。

**示例 — 前后对比：**

```md
<!-- ❌ .md：读者要上下翻 -->
## 优化前的日志格式
```c
qemu_log("\t\t[LH] rd=%d, addr=0x%x, val=0x%04x\n", ...)
```

## 优化后的二进制帧
```c
struct inst_trace { uint8_t op; uint16_t ops; uint32_t ts; };
```
```

```mdx
<!-- ✅ .mdx：读者在同位置切换 -->
import { Tabs, Tab } from "@/components/Tabs.astro";

## trace 格式优化

<Tabs>
  <Tab label="优化前：文本日志（~80 bytes/条）">
    ```c
    qemu_log("\t\t[LH] rd=%d, addr=0x%x, val=0x%04x, sign-extended=0x%x\n",
             rd, addr, val, (int32_t)(val << 16) >> 16)
    ```
  </Tab>
  <Tab label="优化后：二进制协议（~7 bytes/条）">
    ```c
    struct inst_trace_frame {
        uint8_t  opcode;     // 1 byte
        uint16_t operands;   // 2 bytes
        uint32_t timestamp;  // 4 bytes
    };
    ```
  </Tab>
</Tabs>
```

**实现要点**：
- 用 Astro 组件实现，纯 CSS 切换，零 JS
- 支持默认选中某个 tab（`default` 属性）
- 每个 `<Tab>` 的内容按标准 Markdown 渲染（因为它们在 `.mdx` 文件中会被 Astro 的 MDX 处理器处理）

**`Tabs.astro` 参考实现：**

```astro
---
interface Props {
  defaultTab?: string;
}

const { defaultTab } = Astro.props;
---

<div class="tabs" data-default={defaultTab}>
  <div class="tab-list" role="tablist">
    {Astro.slots.tabs?.map((tab, i) => (
      <button class="tab-btn" role="tab" data-index={i}>{tab.props.label}</button>
    ))}
  </div>
  <div class="tab-panels">
    {Astro.slots.tabs?.map((tab, i) => (
      <div class="tab-panel" role="tabpanel" data-index={i}>
        <slot name={`tab-${i}`} />
      </div>
    ))}
  </div>
</div>

<style>
  /* 纯 CSS tab 切换逻辑 */
</style>
```

> 实现细节：用 Astro 的 named slots 或直接遍历 children。最简单的方式是每个 `<Tab>` 作为 `<slot>` 渲染，用 CSS `:target` 或 radio button hack 做切换。

---

### 场景 2：架构图/流程图的交互式标注

**触发条件**：文章里有一张 D2 图，但图中有 5+ 个节点/步骤需要额外文字解释，如果全写在正文里会打断叙事流。

**组件**：`AnnotatedDiagram.astro` —— 静态 SVG 图表 + 右侧/下方说明卡片，点击/悬停节点高亮对应说明。

**示例：**

```mdx
import AnnotatedDiagram from "@/components/AnnotatedDiagram.astro";

<AnnotatedDiagram
  src="./multi-level-meta.d2"
  annotations={{
    "gen_dispatch.py": "扫描所有 ISA 的 YAML spec，收集每条指令的 decode 信息，统一生成 `INSTRUCTION_LIST` 宏和 `DISP_` 枚举",
    "engine.c": "初始化时通过 `#define X(name, ...) dispatch[di++] = &&op_##name` 一次性填充 dispatch 表",
    "dispatch_rebind.h": "RVV SEW 变化时原地改写 dispatch[] 中的标签地址，绕开条件判断",
  }}
/>
```

> 如果不需要交互（节点少、解释短），直接用 D2 图 + 正文说明即可，不要上组件。

---

### 场景 3：性能数据/基准测试对比

**触发条件**：文章里有 3+ 个方案的性能对比数据，或者多个维度的指标，纯表格无法直观展示"谁好谁差、差距多大"。

**组件**：`BenchmarkChart.astro` —— 用简单 CSS bar chart 或 HTML 进度条展示性能对比，不引入图表库（零 JS）。

**示例：**

```mdx
import BenchmarkChart from "@/components/BenchmarkChart.astro";

## 性能优化效果

<BenchmarkChart
  data={[
    { label: "Baseline (TCG)", value: 1.0 },
    { label: "+ computed-goto", value: 5.2 },
    { label: "+ 预解码", value: 10.4 },
    { label: "+ RVV/MMA 自定义指令", value: 18.7 },
    { label: "+ 线程池并发", value: 42.5 },
  ]}
  unit="x 加速比"
  barColor="var(--accent)"
/>
```

**实现要点**：
- 纯 CSS bar chart，不需要 Chart.js / ECharts
- 支持标注基准线（`baseline: 1.0`）
- 颜色使用 CSS 变量以适配明暗主题

---

### 场景 4：运行时行为/算法演示

**触发条件**：文章在解释一个**动态行为**（如 producer/consumer 竞态、ring buffer 读写、调度算法、状态机转换），静态图和文字难以传达"它怎么动的"。

**这是 MDX 价值最大的场景，也是门槛最高的场景。** 只有在读者确实"不看到运行就理解不了"时才使用。

**组件形式**：一个简单的 Astro 组件 + `<script>` 标签做客户端交互。可以用纯 JS（操作 DOM），不需要 React。

**示例 — ring buffer 生产者/消费者演示：**

```mdx
import RingBufferDemo from "@/components/RingBufferDemo.astro";

## 无锁环形缓冲区

<RingBufferDemo />
```

**`RingBufferDemo.astro` 参考骨架：**

```astro
<div id="ringbuf-demo" class="ringbuf-demo">
  <canvas id="ringbuf-canvas" width="600" height="200"></canvas>
  <div class="ringbuf-controls">
    <button id="btn-produce">生产一个数据包</button>
    <button id="btn-consume">消费一个数据包</button>
    <button id="btn-reset">重置</button>
  </div>
  <div class="ringbuf-stats">
    <span>读指针: <code id="stat-r">0</code></span>
    <span>写指针: <code id="stat-w">0</code></span>
    <span>缓冲区占用: <code id="stat-used">0/32</code></span>
  </div>
</div>

<script>
  // 纯 JS 实现，操作 canvas 画环形缓冲区
</script>

<style>
  .ringbuf-demo { /* ... */ }
</style>
```

> 这类组件的复杂度要控制：目标是 **10 分钟能理解的 demo**，不是做一个完整的模拟器。50 行 JS 能说清的概念，不要用 500 行。

---

### 场景 5：自动生成的相关文章推荐

**触发条件**：文章属于一个系列，或者有明确的标签分组，手动维护"相关文章"列表容易过时。

**组件**：`RelatedPosts.astro` —— 在构建时根据标签匹配生成相关文章卡片。

**示例：**

```mdx
import RelatedPosts from "@/components/RelatedPosts.astro";

## 参考资料

<RelatedPosts tags={["QEMU", "GPU"]} exclude="/posts/from-a-cmodel" max={4} />
```

**实现要点**：
- 组件通过 `Astro.glob()` 或 `getCollection()` 获取所有文章
- 按标签交集数量排序
- 排除当前文章自身
- 纯构建时渲染，客户端零开销

---

## 组件开发规范

### 放置位置

所有 MDX 用到的组件放在 `src/components/` 下。文件名用 **PascalCase**：`Tabs.astro`、`BenchmarkChart.astro`。

### 实现原则

1. **优先 Astro 组件**（`.astro`）：大部分场景不需要 React。Astro 组件在构建时渲染为 HTML，客户端零开销。
2. **需要交互时才加 JS**：Tabs（纯 CSS）、BenchmarkChart（纯 CSS）不需要 JS；RingBufferDemo 等运行时代码需要在 `<script>` 标签里写少量 JS。不要引入 React 仅为了做 tab 切换。
3. **适配明暗主题**：颜色使用 CSS 变量（`var(--accent)`、`var(--muted)` 等），不用硬编码颜色值。
4. **体积控制**：单个组件（含 JS/CSS）不应超过约 100 行。如果超出了，说明场景太复杂，应该重新考虑是否需要这个组件。

### 组件创建流程

1. 用户提出需求："这篇文章这里我想让读者能 XXX"
2. Agent 判断：没有这个交互，读者会 miss 什么？如果答案是"不会 miss 重要信息"，建议放弃。
3. 如果确实需要，Agent 创建 `src/components/<ComponentName>.astro`，实现组件。
4. 在文章的 `.mdx` 文件中 import 并使用该组件。
5. 运行 `pnpm build` 验证构建通过。

---

## 常见误区

| 误区 | 为什么错 |
|---|---|
| "这个图表用交互式比静态好" | 如果静态图已经能说明白，交互式只是增加认知负担 |
| "加了 Tabs 看起来更专业" | 如果只有一个版本，不需要 tab |
| "React 组件生态丰富" | 这个站点是 Astro 静态博客，引入 React 只为做个 tab 是过度工程化 |
| "先加组件，以后可能有意义" | 死代码。没有当前需求就不要加 |
