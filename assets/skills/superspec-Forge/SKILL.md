---
name: superspec-Forge
description: "Superspec Phase 3: Build [FUSED]. Create implementation plans, select execution methods (Subagent/Direct), and execute tasks with integrated TDD and Debugging in one pipeline."
---

# Superspec Phase 3: Build (Integrated)

This is a **Fused Skill**. You no longer need to load separate Superspec `writing-plans` or `executing-plans` skills.

## 1. Unified Planning (Inline Planning)

Directly create the implementation plan based on the Technical Design.

**Planning Flow**:
- Read the Design Doc and `roadmap.md`.
- Break down into atomic, executable tasks.
- Record `base-ref`: `git rev-parse HEAD`.
- Write to `.superspec/forge/YYYY-MM-DD-<feature>.md`.

**Blocking Point**: Ask user to **Continue Execution** or **Pause to Switch Model**.

## 2. Integrated Execution (Subagent vs. Direct)

Drive the execution without reloading skills.

**Configuration Choice (Blocking Point)**:
Wait for user to choose:
- **Isolation**: Branch vs. Worktree.
- **Mode**: Subagent-driven vs. Direct Execution.
- **TDD**: tdd vs. direct implementation.

**Execution Guard**:
- **Atomic Commits**: Commit and check off task in `roadmap.md` after EACH implementation step.
- **Inline TDD**: If `tdd: tdd`, write a failing test first for every task.
- **Integrated Debugging**: If a crash/failure occurs, immediately switch to root-cause investigation before proposing fixes.

## 3. Exit and Transition

**Verification Gate**:
- Run project Forge/tests.
- Perform a final review of implemented code.

**State Update**:
```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Forge --apply
```

## Exit Conditions

- All tasks in `roadmap.md` and Plan checked off.
- All code committed.
- Build and tests PASS.
- **Phase transition**: Superspec state machine updated to `phase: Refine`.

## NEXT Action

Run `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" next <change-name>` to determine if you should auto-invoke `/superspec-Refine`.
