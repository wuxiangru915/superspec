# Superspec

[English](README.md) | [中文](README-zh.md)

[![npm version](https://img.shields.io/npm/v/@rpamis/superspec.svg)](https://www.npmjs.com/package/@rpamis/superspec)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)

**Superpowers + OpenSpec — fused into one autonomous development engine.**

Superspec is a **super compound skill** for AI coding agents. It merges two proven systems into a single, self-regulating workflow:

- **[OpenSpec](https://github.com/Fission-AI/OpenSpec)** — a specification-driven lifecycle that forces your AI to think before it codes. The 5-phase state machine (Vision → Blueprint → Forge → Refine → Deliver) ensures every feature goes through rigorous gates before a single line of production code is written.

- **[Superpowers](https://github.com/obra/superpowers)** — a suite of expert-level skills that teach your AI *how* to work: brainstorming, executing plans, requesting code reviews, systematic debugging, and finishing development branches like a senior engineer.

**Superspec unifies them.** OpenSpec provides the *discipline* (what to do and when). Superpowers provides the *capability* (how to do it well). The result is an AI agent that doesn't just follow orders — it engineers software with structure, rigor, and craft.

## Why This Matters

Most AI coding tools give you either a workflow *or* skills, but not both:

| Approach | What you get | What's missing |
|----------|-------------|----------------|
| Raw AI agent | Flexibility | No structure, context drift, hallucinated plans |
| Workflow-only (OpenSpec) | Phase discipline | AI lacks the skills to execute each phase well |
| Skills-only (Superpowers) | Expert techniques | No lifecycle, no state tracking, no phase gates |
| **Superspec** | **Both** | **Nothing** |

Superspec is the only tool that combines lifecycle management with embedded expert skills, enforced by a strict state machine with phase transitions, artifact tracking, and context compression.

## Install

Requires Node.js 20+ and a Bash-compatible shell.

```bash
npm install -g @rpamis/superspec
```

## Quick Start

```bash
cd your-project
superspec ignite
```

This detects your AI platforms (Claude Code, Cursor, Windsurf, etc.), distributes the compound skill (OpenSpec lifecycle + Superpowers techniques) into your agent's configuration, and sets up the `.superspec` workspace.

Then tell your AI agent:

> *"Start the /superspec workflow for a new user authentication feature."*

The AI will automatically enter Vision mode, use Superpowers brainstorming techniques to explore requirements, and produce an `intent.md` — all gated by the state machine.

## How It Works

```
  ┌─────────────────────────────────────────────────┐
  │                 Superspec Engine                 │
  │                                                  │
  │   OpenSpec (Lifecycle)    Superpowers (Skills)   │
  │   ┌──────────────┐      ┌──────────────────┐    │
  │   │ 1. Vision    │──────│ Brainstorming    │    │
  │   │ 2. Blueprint │──────│ Exploring plans  │    │
  │   │ 3. Forge     │──────│ Executing plans  │    │
  │   │ 4. Refine    │──────│ Code review      │    │
  │   │ 5. Deliver   │──────│ Finishing branch │    │
  │   └──────────────┘      └──────────────────┘    │
  │          ↕                       ↕               │
  │      state.yaml          .superspec/skills/      │
  └─────────────────────────────────────────────────┘
```

The state machine controls *when* each skill activates. The skills control *how* each phase executes. Neither works as well without the other.

## The 5-Phase Lifecycle

Each phase leverages specific Superpowers skills and produces tracked artifacts.

### 1. Vision

*Skills: brainstorming, exploring requirements*

Define what you're building and why. The AI explores your idea, clarifies ambiguities, and produces `intent.md`.

### 2. Blueprint

*Skills: exploring plans, evaluating trade-offs*

Design how it will be built. Deep technical brainstorming on architecture, data flow, and interfaces. Produces `blueprint.md`.

### 3. Forge

*Skills: executing plans, systematic debugging*

Break it into tasks and build it. The AI generates an atomic task list in `roadmap.md` and executes systematically with TDD.

### 4. Refine

*Skills: code review, requesting reviews*

Test and validate. Runs test suites, analyzes failures, fixes bugs, and optionally requests human code review.

### 5. Deliver

*Skills: finishing development branch*

Archive and clean up. Moves the mission to the vault, syncs global specs, and closes the workflow loop.

## Workspace Structure

```text
.superspec/
├── config.yaml             # Engine configuration
├── missions/
│   ├── <change-name>/
│   │   ├── state.yaml      # State machine tracker
│   │   ├── intent.md       # Vision artifacts
│   │   ├── blueprint.md    # Blueprint artifacts
│   │   └── roadmap.md      # Forge artifacts
│   └── archive/            # Delivered missions
└── specs/                  # Synchronized specifications
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `superspec ignite [path]` | Install the compound skill into AI platforms |
| `superspec gauge [path]` | Show current mission progress |
| `superspec mend [path]` | Diagnose and fix environment issues |
| `superspec sync [path]` | Update local embedded skills |

## Supported Platforms

28+ AI coding platforms, including:

Claude Code · Cursor · Windsurf · GitHub Copilot · Gemini CLI · RooCode · Cline · *and more*

## License

[MIT](LICENSE)

---

*Superspec = [OpenSpec](https://github.com/Fission-AI/OpenSpec) + [Superpowers](https://github.com/obra/superpowers). Both are MIT licensed.*
