# Superspec

[English](README.md) | [中文](README-zh.md)

[![npm version](https://img.shields.io/npm/v/@rpamis/superspec.svg)](https://www.npmjs.com/package/@rpamis/superspec)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)

**Superpowers + OpenSpec — 融合为一体的自主开发引擎。**

Superspec 是一个面向 AI 编码代理的**超级复合 Skill**。它将两套久经考验的系统合并为一个自律的工作流引擎：

- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** — 规格驱动的生命周期管理。5 阶段状态机（Vision → Blueprint → Forge → Refine → Deliver）强制你的 AI 先思考再编码，每个功能必须通过严格的阶段守卫，才能进入下一步。

- **[Superpowers](https://github.com/obra/superpowers)** — 专家级技能包。教会你的 AI *如何*工作：头脑风暴、执行计划、代码审查、系统化调试、完成开发分支——像资深工程师一样。

**Superspec 把它们统一了。** OpenSpec 提供*纪律*（做什么、什么时候做）。Superpowers 提供*能力*（怎么做好）。结果是一个不仅听指令，更能以结构化、严谨的方式进行软件工程的 AI 代理。

## 为什么这很重要

大多数 AI 编码工具只给你工作流*或者*技能，但不能兼得：

| 方式                | 你得到什么    | 缺少什么                 |
| ----------------- | -------- | -------------------- |
| 原始 AI 代理          | 灵活       | 没有结构、上下文漂移、幻觉计划      |
| 仅工作流 (OpenSpec)   | 阶段纪律     | AI 缺乏执行每个阶段的能力       |
| 仅技能 (Superpowers) | 专家技巧     | 没有生命周期、没有状态追踪、没有阶段守卫 |
| **Superspec**     | **两者兼得** | **什么都不缺**            |

Superspec 是唯一将生命周期管理与嵌入式专家技能结合的工具，由严格的状态机强制执行阶段转换、制品追踪和上下文压缩。

## 安装

前置要求：Node.js 20+ 和支持 Bash 的终端环境。

```bash
npm install -g @rpamis/superspec
```

## 快速开始

```bash
cd your-project
superspec ignite
```

这会检测你的 AI 平台（Claude Code、Cursor、Windsurf 等），将复合 Skill（OpenSpec 生命周期 + Superpowers 技巧）分发到你的代理配置中，并初始化 `.superspec` 工作区。

然后告诉你的 AI 代理：

> *"启动 /superspec 工作流，我们要开发一个新的用户认证功能。"*

AI 会自动进入 Vision 模式，使用 Superpowers 的头脑风暴技巧来探索需求，并产出 `intent.md` —— 全程由状态机把关。

## 工作原理

```
  ┌─────────────────────────────────────────────────┐
  │                 Superspec 引擎                   │
  │                                                  │
  │   OpenSpec (生命周期)      Superpowers (技能)     │
  │   ┌──────────────┐      ┌──────────────────┐    │
  │   │ 1. Vision    │──────│ 头脑风暴          │    │
  │   │ 2. Blueprint │──────│ 探索方案          │    │
  │   │ 3. Forge     │──────│ 执行计划          │    │
  │   │ 4. Refine    │──────│ 代码审查          │    │
  │   │ 5. Deliver   │──────│ 完成分支          │    │
  │   └──────────────┘      └──────────────────┘    │
  │          ↕                       ↕               │
  │      state.yaml          .superspec/skills/      │
  └─────────────────────────────────────────────────┘
```

状态机控制*何时*激活每个技能。技能控制*如何*执行每个阶段。两者缺一不可。

## 5 阶段生命周期

每个阶段调用特定的 Superpowers 技能，并产出可追踪的制品。

### 1. Vision（愿景探索）

*技能：头脑风暴、需求探索*

定义要做什么以及为什么。AI 探索你的想法，澄清模糊地带，产出 `intent.md`。

### 2. Blueprint（技术蓝图）

*技能：方案探索、权衡评估*

设计如何实现。深度技术头脑风暴，评估架构、数据流和接口。产出 `blueprint.md`。

### 3. Forge（代码锻造）

*技能：执行计划、系统化调试*

拆解任务并构建。AI 在 `roadmap.md` 中生成原子级任务清单，以 TDD 方式逐一执行。

### 4. Refine（验证精修）

*技能：代码审查、请求审查*

测试和验证。运行测试套件，分析失败原因，修复 Bug，可选请求人工代码审查。

### 5. Deliver（最终交付）

*技能：完成开发分支*

归档和清理。将任务移入保险库，同步全局规格，关闭工作流循环。

## 工作区结构

```text
.superspec/
├── config.yaml             # 引擎全局配置
├── missions/
│   ├── <change-name>/
│   │   ├── state.yaml      # 状态机追踪器
│   │   ├── intent.md       # Vision 制品
│   │   ├── blueprint.md    # Blueprint 制品
│   │   └── roadmap.md      # Forge 制品
│   └── archive/            # 已交付的任务
└── specs/                  # 同步后的规格说明
```

## CLI 命令

| 命令                        | 说明                 |
| ------------------------- | ------------------ |
| `superspec ignite [path]` | 将复合 Skill 注入 AI 平台 |
| `superspec gauge [path]`  | 查看当前任务进度           |
| `superspec mend [path]`   | 诊断并修复环境问题          |
| `superspec sync [path]`   | 更新本地嵌入的技能          |

## 平台支持

28+ AI 编码平台，包括：

Claude Code · Cursor · Windsurf · GitHub Copilot · Gemini CLI · RooCode · Cline · *以及更多*

## 许可证

[MIT](LICENSE)

---

*Superspec = [OpenSpec](https://github.com/Fission-AI/OpenSpec) + [Superpowers](https://github.com/obra/superpowers)。两者均为 MIT 许可。*
