---
title: "Vortex SimX 源码解读（一）：仿真引擎基础框架"
author: "random25160765"
pubDatetime: 2026-05-15T00:00:00Z
featured: false
draft: false
tags:
  - RISC-V
  - GPU
  - Vortex
  - C++
description: "Vortex SimX 仿真引擎基础框架源码解读，包含 SimObject、SimPort、SimEvent 和 SimPlatform 的设计分析。"
---

> [!NOTE] 主要贡献者
> 作者：[@random25160765-collab](https://github.com/random25160765-collab)
> 
> *本系列笔记包含 ai 辅助创作，作者对内容负责。*

Vortex 是一个基于 RISC-V 指令集，运行在 FPGA 上的，支持 OpenCL/OpenGL 的 GPGPU 原型系统，旨在填补开源 GPU 基础设施空白^[1]；而 SimX 是 Vortex 团队用 C++ 编写的一个功能模拟器，用于在软件层面模拟 Vortex GPGPU 的行为。本系列笔记仅专注于 SimX 代码的解读。

> [!INFO] 代码版本标注
> 
> 本文分析基于以下固定版本：
> - 仓库：https://github.com/vortexgpgpu/vortex
> - 分支：master
> - Commit：`f00bb142`
> - 同步时间：2026-05-11
> 
> *后续相关文章均引用本文作为版本基准。*
> 
> *注意：Vortex 是一个极其活跃的项目，在本文撰写时，主分支又有了数个新的提交，可能正在经历大规模重构。本文档作为一份”技术考古”分析，侧重于捕获该项目核心仿真引擎中不变的设计骨架和思想，而非特定代码行的实时追踪。*

> [!NOTE] 观前须知
> 本系列笔记的作者是一位正在同步学习 C++ 和体系结构的学生。因此，笔记中会包含大量对（未来）我自己有帮助的语法拆解和设计思想溯源。如果你已经是熟手，可以跳过那些部分，直接看架构分析；如果你也是新手，欢迎和我一起从那些基础的地方开始思考。

---

## Table of contents

---

## 源代码目录结构

```text
vortex/
└── sim/
    ├── common/
    │   ├── bitmanip.h             // 位操作
    │   ├── bitvector.h            // 位向量数据结构
    │   ├── dram_sim.h/cpp         // DRAM 模拟，Ramulator 桥接层
    │   ├── linked_list.h          // 侵入式链表
    │   ├── mem.h/cpp              // 内存管理
    │   ├── mem_alloc.h
    │   ├── mempool.h
    │   ├── mp_macros.h
    │   ├── rvfloats.h/cpp         // 浮点数操作，调用 softfloat 库
    │   ├── simobject.h            // 仿真引擎基类
    │   ├── softfloat_ext.h/cpp
    │   ├── stringutil.h
    │   ├── tensor_cfg.h
    │   └── util.h/cpp
    │
    ├── simx/
    │   ├── arch.h
    │   ├── cache_cluster.h
    │   ├── cache_sim.h/cpp
    │   ├── cluster.h/cpp
    │   ├── constants.h
    │   ├── core.h/cpp
    │   ├── dcrs.h/cpp
    │   ├── debug.h
    │   ├── decode.cpp
    │   ├── dispatcher.h/cpp
    │   ├── dtm/
    │   │   ├── debug_module.h/cpp
    │   │   ├── jtag_dtm.h/cpp
    │   │   └── remote_bitbang.h/cpp
    │   ├── emulator.h/cpp
    │   ├── execute.cpp
    │   ├── func_unit.h/cpp
    │   ├── ibuffer.h
    │   ├── instr.h
    │   ├── instr_trace.h
    │   ├── local_mem.h/cpp
    │   ├── main.cpp
    │   ├── mem_coalescer.h/cpp
    │   ├── mem_sim.h/cpp
    │   ├── opc_unit.h/cpp
    │   ├── operands.h/cpp
    │   ├── pipeline.h
    │   ├── processor.h/cpp
    │   ├── processor_impl.h
    │   ├── scoreboard.h
    │   ├── socket.h/cpp
    │   ├── sst/
    │   │   ├── vortex_gpgpu.h/cpp
    │   │   └── vortex_simulator.h/cpp
    │   ├── tcu/
    │   │   └── tensor_unit.h/cpp
    │   ├── types.h/cpp
    │   └── vpu/
    │       ├── vec_ops.h
    │       ├── vec_unit.h/cpp
    │       ├── vopc_unit.h/cpp
    │       └── voperands.h/cpp
    │
    ├── opaesim/                       // Intel OPAE FPGA 后端
    ├── rtlsim/                        // RTL 仿真后端
    └── xrtsim/                        // Xilinx XRT FPGA 后端
```

`common/` 提供所有仿真后端共用的基础组件，`simx/` 是 GPU 功能模拟器本身。

> [!QUESTION] 本篇范围
> 本篇分析的文件：
>  - `sim/common/simobject.h`

`simobject.h` 中定义了 `SimPlatform`，`SimObjectBase` ，`SimObject`， `SimPortBase`， `SimPort`， `SimEventBase`， `SimCallEvent`，`SimPortEvent` 等一系列硬件仿真引擎的基础模板类，通过模板和泛型来实现所有硬件和事件的建模，是整个 SimX 的最底层组件。个人认为这个部分是所有部分中几乎最抽象最难看懂的。

让我们一个一个类来。

---
## SimObject

先来看 `SimObjectBase`。

```cpp file="sim/common/simobject.h"
class SimObjectBase {
public:
    typedef std::shared_ptr<SimObjectBase> Ptr;

    virtual ~SimObjectBase() {}
	// 返回模块的名字
    const std::string& name() const {
        return name_;
    }

protected:
    SimObjectBase(const SimContext&, const std::string& name) : name_(name) {}

private:
    std::string name_;

    virtual void do_reset() = 0;

    virtual void do_tick() = 0;

    friend class SimPortBase;
    friend class SimPlatform;
};
```

`SimObjectBase` 是整个仿真框架的最底层基类，所有仿真模块（Core、Cache、Cluster、Memory...）最终都继承自它。它定义了仿真模块的最小公约数：
- 有名字
- 可以被重置
- 可以被时钟驱动
- 可以用智能指针管理生命周期

其中 `typedef std::shared_ptr<SimObjectBase> Ptr` 提供同一的智能指针别名，用 `SimObjectBase::Ptr` 即可代替 `std::shared_ptr<SimObjectBase>`；`virtual ~SimObjectBase() {}` 定义了一个虚析构函数，利用虚析构函数可以实现多态删除。这是基类的常见做法。

最值得注意的是复位和时钟驱动是 private + virtual，这意味着复位和时钟逻辑必须由子类实现，且只有友元 `SimPlatform` 可以调用。也就是说：**所有的模块必须通过统一的平台驱动**。

> [!FAQ] 语法
> 在 C++ 中，`= 0` 是纯虚函数的声明语法。它表示这个函数没有实现，任何派生类都必须实现这些函数。（普通虚函数有默认实现，派生类可以覆盖也可以不覆盖）

构造函数里有一个 `SimContext`，它的实现是这样：

```cpp file="sim/common/simobject.h"
class SimContext {
private:
    SimContext() {}

    friend class SimPlatform;
};
```

这是一个 token class（令牌类）。它控制着构造函数的访问，在编译期提供权限检查。`SimContext` 的构造权限只有 `SimPlatform` 有，这样外部代码就无法随意构造，确保所有模块由 `SimPlatform` 统一创建。

然后再来看 `SimObject`。

```cpp
template <typename Impl>
class SimObject : public SimObjectBase {
public:
    typedef std::shared_ptr<Impl> Ptr;

    template <typename... Args>
    static Ptr Create(Args&&... args);

protected:
    SimObject(const SimContext& ctx, const std::string& name)
        : SimObjectBase(ctx, name)
    {}

private:
    const Impl* impl() const {
        return static_cast<const Impl*>(this);
    }

    Impl* impl() {
        return static_cast<Impl*>(this);
    }

    void do_reset() override {
        this->impl()->reset();
    }

    void do_tick() override {
        this->impl()->tick();
    }
};
```

这是一个派生类和基类之间的胶水层，通过 CRTP 机制实现简洁的写法。先来看 private 部分。首定义了两种类内部获取指针的方法 `Impl`，即只读和非只读两种访问，但类内只用到了非只读这一种。

`do_reset` 和 `do_tick` 这两个方法很有意思，不仅仅是简单的转发。`SimObjectBase` 要求实现 `do_reset`/`do_tick`（纯虚函数）。`SimObject` 把这个要求自动转发到 `Impl` 的 `reset()`/`tick()`。

举个例子。假设我现在要实现一个叫 `Cluster` 的模块，只需要这样写：

```cpp
class Cluster : public SimObject<Cluster> {
public:
	// 这两个函数必须实现
	void reset() { ... }
	void tick()  { ... }
}
```

`SimObject<Impl>` 利用 CRTP（`Impl` 就是子类自己）在编译期自动生成：
- `do_reset` → `reset`
- `do_tick` → `tick`
- `Create` 工厂方法
让具体模块只关注自己的 `reset()` 和 `tick()` 逻辑，其他样板代码全部由模板自动生成。

再来看 public 部分。`typedef` 那一行使得指针可以写成 `Impl::Ptr`，不必多说；`Create` 是一个简便方法，最终调用 `SimPlatform` 的 `create_object` 方法注册对象，用的时候写成 `Impl::Create(args...)`。

> [!FAQ] 语法
> ```cpp
> template <typename... Args>
> static Ptr Create(Args&&... args);
> ```
> 可变参数模板 + 完美转发：`T&&` 是万能引用，配合 `std::forward<T>` 使用。
>
> 在 `SimPlatform` 里是这样用的：
> ```cpp
> template <typename Impl, typename... Args>
> typename SimObject<Impl>::Ptr create_object(Args&&... args) {
>     auto obj = std::make_shared<Impl>(SimContext{}, std::forward<Args>(args)...);
>     objects_.push_back(obj); // 推入模块指针的队列
>     return obj;
> }
> ```
> 配合转发函数
> ```cpp
> template <typename Impl>
> template <typename... Args>
> typename SimObject<Impl>::Ptr SimObject<Impl>::Create(Args&&... args) {
>     return SimPlatform::instance().create_object<Impl>(std::forward<Args>(args)...);
> }
> ```
> 最后的函数调用链长这样（以 Cluster 为例）：
> ```text
> Cluster::Create(args)
>   → SimObject<Cluster>::Create(args)
>     → SimPlatform::instance().create_object<Cluster>(args)
>       → std::make_shared<Cluster>(...)
>       → objects_.push_back(obj)
>   → 返回 shared_ptr<Cluster>
> ```

---
## SimPort

先来看 `SimPortBase`。

```cpp file="sim/common/simobject.h"
class SimPortBase {
public:
    virtual ~SimPortBase() {}

    SimObjectBase* module() const {
        return module_;
    }

    SimPortBase* sink() const {
        return sink_;
    }

    SimPortBase* source() const {
        return source_;
    }

    virtual bool empty() const = 0;

    virtual bool full() const = 0;

    virtual uint32_t size() const = 0;

    virtual uint32_t capacity() const = 0;

protected:
    SimPortBase(SimObjectBase* module, uint32_t capacity)
        : module_(module)
        , capacity_(capacity)
        , sink_(nullptr)
        , source_(nullptr)
    {}

    virtual void do_pop() = 0;

    SimPortBase& operator=(const SimPortBase&) = delete;

    SimObjectBase* module_;
    uint32_t       capacity_;
    SimPortBase*   sink_;
    SimPortBase*   source_;

    LinkedListNode<SimPortBase> pop_list_;
    LinkedListNode<SimPortBase> push_list_;

    friend class SimPlatform;
};
```

`SimPortBase` 是所有端口的基类。它和 `SimPort<Pkt>` 的关系就像 `SimObjectBase` 和 `SimObject<Impl>` 的关系——提供不需要知道数据包类型的通用接口：
- `module()`：端口所属模块查询；返回模块的指针
- `sink()`，`source()`：数据流图关系查询；返回源/汇端口的指针
- 端口状态查询：空/满/当前占用数量/最大容量
由于都是查询，方法不修改对象的成员变量，所以都带 `const`。

虚析构函数自不必多说；端口状态查询的四个函数都是虚函数，由子类实现；端口创建时必须指定所属模块和容量（`capacity_` 为 0 就是“虚端口”，即只做连线，不存数据）；`do_pop()` 和 `do_reset` / `do_tick` 遵循一样的设计模式，都是只给平台用的；`= delete` 删除端口拷贝赋值操作，端口不能被拷贝赋值，只能通过 `bind` / `unbind` 改变连接关系。

最后两个是侵入式链表节点。当端口被 push 或 pop 时，`SimPlatform` 会把端口挂到平台的 `push_list_` 或 `pop_list_` 链表上，本周期结束时由平台统一处理。

这里用到了侵入式链表的设计，参见 vortex/sim/common/linked_list.h。

---

然后再来看 `SimPort`。端口的数据缓冲/传输/类型转换，多端口串联等逻辑都在模板子类 `SimPort<Pkt>` 中实现。

```cpp file="sim/common/simobject.h"
template <typename Pkt>
class SimPort : public SimPortBase {
public:
    typedef std::function<void (const Pkt&, uint64_t)> TxCallback;
	
	// 构造的时候要传入端口所属的模块，端口的容量（默认为 0）
	// 还有监测回调
    SimPort(SimObjectBase* module, uint32_t capacity = 0)
        : SimPortBase(module, capacity)
        , tx_cb_(nullptr)
    {}

    // 同类型端口连接
    void bind(SimPort<Pkt>* sink) {
        __vortex_assert(0 == capacity_, "only virtual ports can be used a link!")
        assert(sink_ == nullptr);
        sink->source_ = this;
        sink_ = sink;
        sink_transfer_ = nullptr;
    }

    // 异类型端口连接
    template <typename U>
    void bind(SimPort<U>* sink) {
        __vortex_assert(0 == capacity_, "only virtual ports can be used a link!")
        assert(sink_ == nullptr);
        sink->source_ = this;
        sink_ = sink;
        // lambda 调用下游端口的 transfer
        sink_transfer_ = [sink](const Pkt& pkt, uint64_t cycles) {
            sink->transfer(static_cast<U>(pkt), cycles);
        };
    }
	
	// 异类型端口连接，自定义转发函数
    template <typename U, typename Converter>
    void bind(SimPort<U>* sink, const Converter& converter) {
        __vortex_assert(0 == capacity_, "only virtual ports can be used a link!")
        assert(sink_ == nullptr);
        sink->source_ = this;
        sink_ = sink;
        sink_transfer_ = [sink, converter](const Pkt& pkt, uint64_t cycles) {
            sink->transfer(static_cast<U>(converter(pkt)), cycles);
        };
    }
	
	// 取消绑定
    void unbind() {
        if (sink_) {
            sink_->source_ = nullptr;
            sink_ = nullptr;
            sink_transfer_ = nullptr;
        }
    }
	
	// 判断数据队列是否空
	// 使用链式判断，如果是虚端口则直接转发，最终输出的是目标实端口的缓冲区容量
    bool empty() const override {
        if (sink_) {
            return sink_->empty();
        }
        return queue_.empty();
    }
    
	// 判断数据队列是否满
	// 同样是链式判断
    bool full() const override {
        if (sink_) {
            return sink_->full();
        }
        return (capacity_ != 0 && queue_.size() >= capacity_);
    }
	
	// 输出端口缓冲区大小：同样是链式转发
    uint32_t size() const override {
        if (sink_) {
            return sink_->size();
        }
        return queue_.size();
    }

	// 输出端口缓冲区容量：同上
    uint32_t capacity() const override {
        if (sink_) {
            return sink_->capacity();
        }
        return capacity_;
    }
	
	// 获取数据队列头部的数据包
    const Pkt& front() const {
        __vortex_assert(sink_ == nullptr, "cannot be called on a stub port!")
        __vortex_assert(!this->empty(), "port is empty!");
        return queue_.front();
    }
	
	// 同上
    Pkt& front() {
        __vortex_assert(sink_ == nullptr, "cannot be called on a stub port!")
        __vortex_assert(!this->empty(), "port is empty!");
        return queue_.front().pkt;
    }

	// 数据队列的 push / pop 操作，由平台统一管理
    void push(const Pkt& pkt, uint64_t delay = 1);

    uint64_t pop();

    void tx_callback(const TxCallback& callback) {
        tx_cb_ = callback;
    }

protected:
	// 带时间信息的数据包
    struct timed_pkt_t {
        Pkt      pkt;
        uint64_t cycles;
    };
	
	// 数据队列，即端口缓冲区
    std::queue<timed_pkt_t> queue_;
    // 性能监测回调函数
    TxCallback tx_cb_;
    // 本端口的数据传输回调函数
    TxCallback sink_transfer_;

	// 数据传输的主要逻辑
    void transfer(const Pkt& pkt, uint64_t cycles) {
        if (tx_cb_) {
            tx_cb_(pkt, cycles);
        }
        if (sink_) {
            if (sink_transfer_) {
                sink_transfer_(pkt, cycles);
            } else {
                reinterpret_cast<SimPort<Pkt>*>(sink_)->transfer(pkt, cycles);
            }
        } else {
            queue_.push({pkt, cycles});
        }
    }

    void do_pop() override {
        queue_.pop();
    }

    SimPort& operator=(const SimPort&) = delete;

    template <typename U> friend class SimPortEvent;
    template <typename U> friend class SimPort;
};
```

首先来看数据包的定义：

```cpp
  struct timed_pkt_t {
    Pkt pkt;
    uint64_t cycles;
  };

  std::queue<timed_pkt_t> queue_;
```

此处 `cycles` 模拟的是数据传输的**硬件延迟**，含义是**数据包就绪的绝对时刻**；`queue_` 是数据的暂存队列，即实端口的数据缓冲区。

> [!NOTE] 硬件延迟模拟
> 真实硬件存在组合逻辑延迟/流水线寄存器拍数延迟等各种硬件延迟。
> 在 SimX 里，硬件延迟通过 cycles = 当前时间 + delay 建模。

然后是端口连接：

```cpp
bind(SimPort<Pkt>* sink)
bind(SimPort<U>* sink)
bind(SimPort<U>* sink, converter)
unbind()
```

> [!NOTE] 端口分类
> 根据容量的不同，端口分两种角色，互斥：
>
> | 端口类型              | 能 `bind` 吗 | 能存数据吗 | 作用            |
> | ----------------- | ---------- | ----- | ------------- |
> | 虚端口（capacity = 0） | ✅ 能        | ❌ 不能  | 连线，把数据导向下游    |
> | 实端口（capacity > 0） | ❌ 不能       | ✅ 能   | 缓冲，数据停在这里等待取出 |
> 
> *所以这里所谓的端口绑定实际上就是**连导线**。*

端口连接分三种情况，同类型直连，异类型连接，异类型 + 自定义类型转换器。操作都是检查容量是否为 0，然后设置双向指针，我方 `sink_` 指向目标，目标 `source_` 指向我。当源和汇的数据包类型不同，需要做类型转换才能调用 `transfer` 投递。

> [!FAQ] 语法
> 这里 `sink_transfer` 回调函数通过 lambda 构造。

`transfer` 是数据传输的函数，如下：

```cpp file="sim/common/simobject.h"
void transfer(const Pkt& pkt, uint64_t cycles) {
	if (tx_cb_) {
		tx_cb_(pkt, cycles);
	}
	if (sink_) {
		if (sink_transfer_) {
			sink_transfer_(pkt, cycles);
		} else {
			reinterpret_cast<SimPort<Pkt>*>(sink_)->transfer(pkt, cycles);
		}
	} else {
		queue_.push({pkt, cycles});
	}
}
```

`tx_cb_` 是监控与统计的函数。把这个函数和上面的 `sink_transfer_` 是异类型绑定时所用的数据传输函数；若未设置且绑定同类型端口，则直接通过 `reinterpret_cast` 调用目标的 `transfer` 函数。

逻辑：
1. 如果有 `tx_cb_`，先调用回调（监控/统计）。
2. 如果已绑定下游 (`sink_` 非空)：
   - 若有 `sink_transfer_`，用它转发（异类型转换）。
   - 否则直接将 `sink_` 强转为 `SimPort<Pkt>*` 并递归调用其 `transfer`。
3. 若没有绑定下游，则直接 push 到自己的 `queue_`。

---

理解了单层绑定后，一个自然的问题是：如果多个虚端口串联，数据包会怎样？答案是**链式转发**——`transfer` 调用 `transfer`，数据包像快递一样一站一站往下传。

为什么会有链式？因为允许多层绑定，虚端口可以串联：

```cpp
// Core 的端口 A（虚端口，capacity = 0）
// Cluster 的端口 B（虚端口，capacity = 0）
// L2Cache 的端口 C（实端口，capacity = 4）

A.bind(&B);  // A → B
B.bind(&C);  // B → C

// 链路：A → B → C（只有 C 有实际存储）
```

这就形成了一条**转发链**。当 Core 调用 `A.push(pkt, 3)` 时，调用链如下：

```
A.transfer(pkt, 3)                          // 端口 A 的 transfer
    ↓ A.sink_ 指向 B，无转换器
    ↓ 执行 reinterpret_cast 强转
B.transfer(pkt, 3)                          // 端口 B 的 transfer（第一跳）
    ↓ B.sink_ 指向 C，无转换器
    ↓ 执行 reinterpret_cast 强转
C.transfer(pkt, 3)                          // 端口 C 的 transfer（第二跳）
    ↓ C.sink_ 为空
C.queue_.push({pkt, 3})                     // 终点：存入队列
```

数据包穿过了 A 和 B 两个虚端口，最终停在有容量的 C。每一跳都是同一个 `transfer` 逻辑的重复执行，只是 `this` 指针不同。

类比快递网络，每站都叫"转运"，但只有最后一站真正把件放下。

```
发件人
  ↓ 交给
小区代收点（虚端口 A，不存件，只中转）
  ↓ 交给
区集散中心（虚端口 B，不存件，只中转）
  ↓ 交给
市总仓库（实端口 C，有容量，真正存件）
```
 
 如果中间某一站类型不同，`sink_transfer_` 会自动处理：
 
```
A (SimPort<CoreReq>) → bind + converter → B (SimPort<CacheReq>) → C (SimPort<MemReq>)
```

```
A.transfer(core_req, 3)
    ↓ sink_transfer_(core_req, 3)       // lambda：CoreReq → CacheReq
B.transfer(cache_req, 3)                // 同类型直连
    ↓ reinterpret_cast 强转
C.transfer(cache_req, 3)                // 终点入队
```

每一站只关心自己的下游是什么类型，链式转发让复杂的数据通路可以像搭积木一样自由组合。

回头看 `transfer` 的代码，它本质上是一个**三态状态机**：

```cpp
if (sink_) {
    if (sink_transfer_) {
    // 状态1：有下游 + 类型不同 → 转换后转发
        sink_transfer_(pkt, cycles);                              
    } else {
    // 状态2：有下游 + 同类型 → 直接转发
        reinterpret_cast<SimPort<Pkt>*>(sink_)->transfer(...);    
    }
} else {
	// 状态3：无下游 → 终止，入队
    queue_.push({pkt, cycles});                                   
}
```

| 状态 | 条件 | 动作 |
|------|------|------|
| 转换转发 | `sink_` 非空 且 `sink_transfer_` 非空 | 调 lambda 包装后的下游 `transfer` |
| 直接转发 | `sink_` 非空 且 `sink_transfer_` 为空 | 强转后直接调下游 `transfer` |
| 终止入队 | `sink_` 为空 | 存入自有队列，链路终点 |

这个状态机在链路上的每一个端口都执行一次，直到数据包到达终点（有容量的端口，或者最终消费者）。这就把"导线"和"缓冲"两种端口角色统一在了一个逻辑框架里。

## SimEvent

`SimEventBase` 和 `SimObjectBase` 对称，但它代表的是"一件事"而不是"一个物"。`SimEventBase` 是整个仿真器**事件系统的底层抽象**，用于表示"在未来某个时钟周期要执行的操作"。所有具体事件（`SimCallEvent`、`SimPortEvent`）都继承自它。

```cpp file="sim/common/simobject.h"
class SimEventBase {
public:
    typedef std::shared_ptr<SimEventBase> Ptr;

    virtual ~SimEventBase() {}

    virtual void fire() const = 0;

    uint64_t cycles() const {
        return cycles_;
    }

protected:
    SimEventBase(uint64_t cycles) : cycles_(cycles) {}

    uint64_t cycles_;

    LinkedListNode<SimEventBase> list_;

    friend class SimPlatform;
};
```

智能指针别名和虚析构不必多说。`fire()` 是纯虚函数，是事件的“执行体”

```cpp
virtual void fire() const = 0;
```

每个事件都必须回答一个问题："触发时要做什么？"

- `SimCallEvent` 的 `fire()`：调用存储的回调函数
- `SimPortEvent` 的 `fire()`：把数据包重新投递到端口

`= 0` 表示这是纯虚函数，`SimEventBase` 是抽象类，不能直接实例化。

`const` 修饰符表示：**事件一旦创建，触发时不应修改事件本身的元数据**（如 `cycles_`、`list_`）。这是不可变对象的设计思想。

`cycles()` 用于查询触发时间。

```cpp
uint64_t cycles() const {
    return cycles_;
}
```

`cycles_` 是事件的触发时间，含义取决于事件类型：对于延迟事件，这是**绝对周期号**（`cycles_ + delay`）；对于即时事件，这是**周期内序号**（`delta_`）——这是“**两级时间槽**”的设计。具体可以看后面 `SimPlatform` 里面的逻辑。

再来看构造函数：

```cpp
SimEventBase(uint64_t cycles) : cycles_(cycles) {}
```

创建事件时必须指定触发时间。构造函数是 `protected`，意味着只有派生类（`SimCallEvent`、`SimPortEvent`）可以构造，外部不能直接创建。

还有就是平台统一管理：嵌入式链表节点的设计，友元的设计（`SimPlatform` 需要直接操作事件的 `list_` 来做队列管理（插入、删除、遍历），以及读取 `cycles_` 来判断触发时机）

然后再来看两种事件。首先是 `SimCallEvent`：

```cpp file="sim/common/simobject.h"
template <typename Pkt>
class SimCallEvent : public SimEventBase {
public:
    void fire() const override {
        func_(pkt_);
    }

    typedef std::function<void (const Pkt&)> Func;

    SimCallEvent(const Func& func, const Pkt& pkt, uint64_t cycles)
        : SimEventBase(cycles)
        , func_(func)
        , pkt_(pkt)
    {}
	
	// 事件的内存分配函数，这里用自定义的内存分配器重载了 new 和 delete 关键词
    static void* operator new(std::size_t sz) {
        __unused (sz);
        assert(sizeof(SimCallEvent<Pkt>) == sz);
        return allocator_.allocate(1);
    }

    static void operator delete(void* ptr, std::size_t sz) noexcept {
        __unused (sz);
        assert(sizeof(SimCallEvent<Pkt>) == sz);
        allocator_.deallocate(static_cast<SimCallEvent<Pkt>*>(ptr), 1);
    }

protected:
    Func func_;
    Pkt  pkt_;
    static inline PoolAllocator<SimCallEvent<Pkt>, 64> allocator_;
};
```

`SimCallEvent<Pkt>` 设计为通用延迟回调事件，是 `SimEventBase` 的派生类，将"在未来某个周期执行一个函数调用"这个操作封装成事件对象。

注意看这里的回调实现逻辑：先保存一个回调函数 `func_`，然后包装并转发给基类的 `fire()` 方法。回调函数和参数在构造时传入：

```cpp
SimCallEvent(const Func& func, const Pkt& pkt, uint64_t cycles)
    : SimEventBase(cycles)
    , func_(func)
    , pkt_(pkt)
{}
```

三个参数：
- `func`：事件触发时要调的函数（常引用传入，避免拷贝，存时拷贝一次）
- `pkt`：数据包副本（事件独立持有，确保触发时原数据可能已销毁）
- `cycles`：触发时间（传给基类）

---

仿真中会高频创建/销毁事件，直接用 `new`/`delete` 会导致内存碎片和系统调用开销。

```cpp
static void* operator new(std::size_t sz) {
    assert(sizeof(SimCallEvent<Pkt>) == sz);
    return allocator_.allocate(1);   // 从池里取 1 个对象
}

static void operator delete(void* ptr, std::size_t sz) noexcept {
    assert(sizeof(SimCallEvent<Pkt>) == sz);
    allocator_.deallocate(static_cast<SimCallEvent<Pkt>*>(ptr), 1);  // 归还
}

static inline PoolAllocator<SimCallEvent<Pkt>, 64> allocator_;
```

- `PoolAllocator<SimCallEvent<Pkt>, 64>`：预分配 64 个事件对象的空间
- 重载 `operator new`/`delete`：让所有 `new SimCallEvent` 都走池分配器
- `assert` 检查大小：防止继承体系导致大小不匹配
- `allocate(1)`：分配 1 个对象（不是 1 字节）

*这部分内容涉及 Vortex SimX 的内存池设计，不在本篇所讲的范围内。*

---

然后再来看 `SimPortEvent`：

```cpp file="sim/common/simobject.h"
template <typename Pkt>
class SimPortEvent : public SimEventBase {
public:
    void fire() const override {
	    // 调用指定端口的数据传输 
        const_cast<SimPort<Pkt>*>(port_)->transfer(pkt_, cycles_);
    }

	// 构造事件的时候，要指定端口
    SimPortEvent(const SimPort<Pkt>* port, const Pkt& pkt, uint64_t cycles)
        : SimEventBase(cycles)
        , port_(port)
        , pkt_(pkt)
    {}

    static void* operator new(std::size_t sz) {
        __unused (sz);
        assert(sizeof(SimPortEvent<Pkt>) == sz);
        return allocator_.allocate(1);
    }

    static void operator delete(void* ptr, std::size_t sz) noexcept {
        __unused (sz);
        assert(sizeof(SimPortEvent<Pkt>) == sz);
        allocator_.deallocate(static_cast<SimPortEvent<Pkt>*>(ptr), 1);
    }

protected:
    const SimPort<Pkt>* port_;
    Pkt pkt_;
    static inline PoolAllocator<SimPortEvent<Pkt>, 64> allocator_;
};
```

完全一样的逻辑。唯一的区别是：`fire` 的逻辑变了。当事件触发时，调用当初指定的端口的数据传输，相当于专门为数据包投递设计了一类事件。可能是因为数据包投递操作在仿真引擎中比较高频，因此作者针对此类操作做了优化。

## SimPlatform

现在我们通过 `SimPlatform` 把全部内容串在一起。

```cpp file="sim/common/simobject.h"
class SimPlatform {
public:
	// 使用 static 关键字，全局只有一个实例
	// 构造函数是 private，外部只能通过 instance() 访问
    static SimPlatform& instance() {
        static SimPlatform s_inst;
        return s_inst;
    }
	
	// 空初始化
    bool initialize() {
        //--
        return true;
    }

	// 仿真结束时调用，清理资源
    void finalize() {
        instance().cleanup();
    }
	
	// 最重要的，模块工厂
	// 所有的模块都通过且只能通过这个工厂创建
    template <typename Impl, typename... Args>
    typename SimObject<Impl>::Ptr create_object(Args&&... args) {
        auto obj = std::make_shared<Impl>(SimContext{}, std::forward<Args>(args)...);
        // objects_ 是全局模块表
        objects_.push_back(obj);
        // 返回 shared_ptr
        return obj;
    }
	
	// 通用事件调度
	// 传入回调函数，数据包和延时
    template <typename Pkt>
    void schedule(const typename SimCallEvent<Pkt>::Func& callback,
                  const Pkt& pkt,
                  uint64_t delay) {
        // 无 delay
        if (delay == 0) {
	        // 注意这里传入的 cycles_ 是 delta_
            auto evt = new SimCallEvent<Pkt>(callback, pkt, delta_);
			// 把事件推入队列
            imm_events_.push_back(evt);
            ++delta_;
        // 有 delay
        } else {
            auto evt = new SimCallEvent<Pkt>(callback, pkt, cycles_ + delay);
            reg_events_.push_back(evt);
        }
    }

    void reset() {
        assert(imm_events_.empty() && "immediate events not cleared!");
        assert(reg_events_.empty() && "registered events not cleared!");
        imm_events_.clear();
        reg_events_.clear();
        for (auto& object : objects_) {
            object->do_reset();
        }
        cycles_ = 0;
        delta_ = 0;
    }
	
	// 推进一步时钟周期
    void tick() {
        // execute objects
        this->fire_immediate_events();
        for (auto& object : objects_) {
            object->do_tick();
            this->fire_immediate_events();
        }

        // realize objects
        for (auto it = pop_list_.begin(); it != pop_list_.end();) {
            it->do_pop();
            it = pop_list_.erase(it);
        }
        push_list_.clear();

        // fire registered events
        this->fire_registered_events();
    }

    uint64_t cycles() const {
        return cycles_;
    }

private:
	// 注意：构造函数在 private 里
    SimPlatform() : cycles_(0), delta_(0) {}

    virtual ~SimPlatform() {
        this->cleanup();
    }

    void cleanup() {
        objects_.clear();
        assert(imm_events_.empty() && "immediate events not cleared!");
        assert(reg_events_.empty() && "registered events not cleared!");
        imm_events_.clear();
        reg_events_.clear();
    }
	
	// 端口数据传输事件调度
    template <typename Pkt>
    void schedule_push(SimPort<Pkt>* port, const Pkt& pkt, uint64_t delay) {
	    // 实端口在队列中登记
        if (port->capacity() != 0) {
            __vortex_assert(0 == push_list_.count(port), "cannot enqueue a port multiple times during the same cycle!");
            push_list_.push_back(port);
        }
        // 创建时间，按延迟分流
        // 还是根据 delay 进行 reg_event 和 imm_event 的分流
        if (delay == 0) {
            auto evt = new SimPortEvent<Pkt>(port, pkt, delta_);
            imm_events_.push_back(evt);
            ++delta_;
        } else {
            auto evt = new SimPortEvent<Pkt>(port, pkt, cycles_ + delay);
            reg_events_.push_back(evt);
        }
    }

    template <typename Pkt>
    void schedule_pop(SimPort<Pkt>* port) {
        __vortex_assert(0 == pop_list_.count(port), "cannot dequeue a port multiple times during the same cycle!");
        pop_list_.push_back(port);
    }
	
	// imm_event 的触发逻辑
    void fire_immediate_events() {
        // fire all events that are scheduled for the current cycle in issue order
        for (uint32_t delta = 0; delta < delta_; ++delta) {
	        // 注意这里用了迭代器
            for (auto evt_it = imm_events_.begin(), evt_it_end = imm_events_.end(); evt_it != evt_it_end;) {
                auto event = &*evt_it;
                // 顺序对上
                if (event->cycles() == delta) {
	                // fire！
                    event->fire();
                    evt_it = imm_events_.erase(evt_it);
                    delete event;
                // 否则继续找
                } else {
                    ++evt_it;
                }
            }
        };
        delta_ = 0;
    }

    void fire_registered_events() {
        // advance the clock
        ++cycles_;

        // fire all events that are scheduled for the current cycle
        // current，检查这一刻有没有 reg_event 要触发
        for (auto evt_it = reg_events_.begin(), evt_it_end = reg_events_.end(); evt_it != evt_it_end;) {
            auto event = &*evt_it;
            if (event->cycles() == cycles_) {
                event->fire();
                evt_it = reg_events_.erase(evt_it);
                delete event;
            } else {
                ++evt_it;
            }
        }
    }
	
	// 平台的核心数据
    std::vector<SimObjectBase::Ptr> objects_;
    LinkedList<SimEventBase, &SimEventBase::list_> reg_events_;
    LinkedList<SimEventBase, &SimEventBase::list_> imm_events_;
    LinkedList<SimPortBase, &SimPortBase::push_list_> push_list_;
    LinkedList<SimPortBase, &SimPortBase::pop_list_> pop_list_;
    uint64_t cycles_;
    uint32_t delta_;

    template <typename U> friend class SimPort;
};
```

这里的 `reg` 大概是 register 的意思，模拟的是 Verilog 里的时序逻辑。`imm` 大概是 immediate，模拟的是组合逻辑。`delay` 模拟的是时序逻辑的延迟，`delta_` 模拟的是组合逻辑的传播次序。

两个有意思的地方：
### `tick()` 方法

Vortex SimX 模拟了周期精确的硬件时序。明确了这一点，再来看 `tick()` 就很清楚了：

```cpp file="sim/common/simobject.h"
void tick() {
    // 处理组合逻辑
    this->fire_immediate_events();     
    for (auto& object : objects_) {
        object->do_tick();
        this->fire_immediate_events();
    }

    // 统一出队
    for (auto it = pop_list_.begin(); it != pop_list_.end();) {
        it->do_pop();
        it = pop_list_.erase(it);
    }
    push_list_.clear();

    // 处理时序逻辑
    this->fire_registered_events();
}
```

注意：这和 Verilog 的事件模型完全不一样。

### `schedule_push/pop()`

这是 `SimPort` 的 `push` 和 `pop` 方法真正调用的函数。包装代码如下：

```cpp file="sim/common/simobject.h"
template <typename Pkt>
void SimPort<Pkt>::push(const Pkt& pkt, uint64_t delay) {
    __vortex_assert(source_ == nullptr, "cannot be called on a sink port!")
    __vortex_assert(!this->full(), "port is full!");
    SimPlatform::instance().schedule_push(this, pkt, delay);
}

template <typename Pkt>
uint64_t SimPort<Pkt>::pop() {
    __vortex_assert(sink_ == nullptr, "cannot be called on a stub port!")
    __vortex_assert(!this->empty(), "port is empty!");
    SimPlatform::instance().schedule_pop(this);
    // 返回头部数据包的就绪时间
    // 这样调用者可以知道数据包时什么时候到达的
    return queue_.front().cycles;
}
```

现在再回头来看 `SimPort` 的数据传输调度就很清楚了。

```text
模块调用 B.pop()
    ↓
schedule_pop(&B)
    ↓
把端口 B 的地址挂到 pop_list_ 链表上（登记！）
    ↓
返回 B.queue_.front().cycles（数据还在队列里！）
    ↓
... tick() 继续执行其他模块 ...
    ↓
步骤③ 统一出队：
    遍历 pop_list_ 链表
    → 对每个登记的端口，调 do_pop()
    → do_pop() 内部：queue_.pop()（从自己的队列里真正删除）
```

---
### 参考资料

1. [Vortex: Extending the RISC-V ISA for GPGPU and 3D-Graphics](https://dl.acm.org/doi/epdf/10.1145/3466752.3480128)