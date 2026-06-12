# Superspec Phase Guard - Build Phase (Soft Rule)

> Injected only during Build phase.

## Build Phase Specifics

### Phase Awareness
- When `phase: Forge`, you are in implementation and task execution.
- **Allowed**: Write source code, tests, execute plans.
- **Prohibited**: Skipping user decision points (isolation/mode choice).

### Required Skill Calls
- **writing-plans** — Create implementation plan.
- **executing-plans** / **subagent-driven-development** — Task execution.
- **test-driven-development** — If `tdd_mode: tdd`.
- **systematic-debugging** — On any failure/crash.
- **using-git-worktrees** — If isolation is worktree.

### Mandatory Script Executions
- **Phase Exit**: `superspec-guard <name> Forge --apply`.
- **Compaction Resume**: `superspec-state check <name> Forge --recover --compact`.

### Build Specific Workflow
1. Plan-ready pause: Must ask user to continue or pause after plan creation.
2. Atomic Commit: Check off task in roadmap.md + git commit after EACH task.
3. Debugging: Use `systematic-debugging` before proposing fixes.
4. Spec Updates: Handle by scale (Small: direct edit, Medium: brainstorming, Large: split change).
