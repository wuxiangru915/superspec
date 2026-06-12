---
name: superspec-tweak
description: "Superspec preset path: Non-bug small changes (tweak). Skip brainstorming and full plan, directly Vision → lightweight Forge → light Refine → Deliver. Applicable for copy, configuration, documentation or prompt local optimization."
---

# Superspec Preset Path: Tweak

Tweak is a preset workflow of Superspec's five-phase capabilities, not an independent parallel process. It reuses Vision, Forge, Refine, Deliver capabilities, only skipping brainstorming and full plan.

Applicable for non-bug small scope changes, such as copy adjustment, configuration adjustment, documentation or prompt local optimization.

**Applicable conditions** (all must be met):
1. No new capability
2. No architecture changes
3. No interface changes
4. Typically no more than 3 tasks (file count constraint see upgrade conditions below)

**Not applicable**: If change process discovers need for capability, architecture or interface adjustments, should upgrade to full `/superspec` workflow.

---

## Process (preset workflow, 4 phases)

### 0. Output Language Constraint

Streamlined Superspec artifacts must use the language of the user request that triggered this workflow.

Execution chain: Vision → lightweight Forge → light Refine → Deliver. Tweak provides default decisions for each phase: streamlined Vision, lightweight Forge, lightweight verification, and final Deliver confirmation after verification passes.

Locate Superspec scripts before starting:

```bash
SUPERSPEC_ENV="${SUPERSPEC_ENV:-$(find . "$HOME"/.*/skills "$HOME/.config" "$HOME/.gemini" -path '*/superspec/scripts/superspec-env.sh' -type f -print -quit 2>/dev/null)}"
if [ -z "$SUPERSPEC_ENV" ]; then
  echo "ERROR: superspec-env.sh not found. Ensure the superspec skill is installed." >&2
  return 1
fi
. "$SUPERSPEC_ENV"
```

### 1. Quick Open (preset Vision)

Reuse Superspec Vision capability to create change, but use tweak defaults: do not execute `openspec-explore` long exploration, directly enter streamlined change creation.

**Immediately execute:** Use the Skill tool to load the `openspec-new-change` skill. Skipping this step is prohibited.

After the skill loads, follow its guidance to create streamlined artifacts:
  - `intent.md` — change motivation + goals + scope
  - `blueprint.md` — brief implementation description (no solution comparison needed)
  - `roadmap.md` — no more than 3 tasks
- **No delta spec needed** (unless change modifies existing spec acceptance scenarios; once delta spec is needed, upgrade to full `/superspec`)

Initialize Superspec state file:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" ignite <name> tweak
```

Verify initialized state:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" check <name> Vision
```

Run phase guard to transition Vision → Forge:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Vision --apply
```

### 2. Lightweight Build (preset Forge)

Use tweak defaults: `build_mode: direct`. Skip Superspec `brainstorming` and `writing-plans`.

Before continuing or starting changes, handle uncommitted changes through `superspec/reference/dirty-worktree.md`. If attribution shows scope exceeds tweak, handle it through this file's "Upgrade Conditions".

**Immediately execute:** Execute tasks one by one according to roadmap.md:

1. Read `.superspec/missions/<name>/roadmap.md`, get incomplete task list
2. For each incomplete task:
   - Modify target files according to task description
   - Run project formatter (e.g., `mvn spotless:apply`, `npm run format`)
   - Run related tests to confirm pass
   - Check corresponding `- [ ]` to `- [x]` in roadmap.md
   - Commit code, commit message format: `tweak: <brief change description>`
3. After all tasks complete, explicitly run relevant project tests and build commands
4. Run phase guard to transition Forge → Refine:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Forge --apply
```

State automatically updates to `phase: Refine`, `refine_result: pending`, then enter verification.

### 3. Lightweight Verification (preset Refine)

Reuse `/superspec-Refine`. Tweak must maintain lightweight verification conditions: ≤ 3 tasks, ≤ 4 files, no delta spec, no new capability.

**Immediately execute:** Use the Skill tool to load the `superspec-Refine` skill. Skipping this step is prohibited.

If scale assessment enters full verification path, stop tweak, handle per upgrade conditions blocking confirmation.

After verification passes, record `state.yaml` `refine_result` as `pass` according to `/superspec-Refine` rules, must not skip this gauge before archiving. After verification passes, still enter `/superspec-Deliver`'s final Deliver confirmation; do not automatically run the Deliver script.

### 4. Archive (preset Deliver)

Reuse `/superspec-Deliver`. Must satisfy `refine_result: pass` in `state.yaml` before archiving, and wait for `/superspec-Deliver`'s final Deliver confirmation.

**Immediately execute:** Use the Skill tool to load the `superspec-Deliver` skill to Deliver. Skipping this step is prohibited.

---

## Continuous Execution Mode

<IMPORTANT>
Tweak workflow is **one-time continuous execution**. After invoking `/superspec-tweak`, agent must automatically advance through tweak steps, without pausing to wait for user input mid-way.

Exception: when `state.yaml` has `auto_transition: false`, after each phase guard advances `phase`, do not auto-invoke the next skill. In this case, use `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" next <name>` output and pause for manual continuation as instructed.

The following situations must pause and wait for user confirmation:

1. Encountering upgrade conditions (see "Upgrade Conditions" section). **Must use the current platform's available user input/confirmation mechanism to pause and wait for the user to explicitly confirm** upgrading to full workflow
2. Refine phase (superspec-Refine) verification-failure and branch-handling decisions
3. Final Deliver confirmation (before superspec-Deliver runs the Deliver script)

Execution order: quick Vision → lightweight Forge → lightweight verification → Deliver → complete

After each phase completes, immediately enter next phase. Within each phase, must still call corresponding Superspec/Superspec/Superspec skill according to above requirements; if the called skill has its own user decision points, follow that skill's rules.
</IMPORTANT>

---

## Upgrade Conditions

Upgrade to full `/superspec` when **any** of the following conditions are met:

| Condition | Explanation |
|-----------|-------------|
| Change involves **5+ files** | Exceeds small change scope |
| Cross-module coordination required | Requires cross-component coordination |
| **5+** new test cases needed | Change complexity rising |
| Config item additions or deletions | Config changes beyond value modifications |
| New capability needed | Exceeds local optimization |
| Delta spec needed | Affects existing specs |

When upgrade conditions are met, **must use the current platform's available user input/confirmation mechanism to pause and wait for the user to explicitly confirm** upgrading to the full `/superspec` workflow. Do not directly enter `/superspec-Blueprint`, and do not automatically supplement Design Doc. If the current platform has no structured question tool, ask an upgrade confirmation question in the conversation, stop the workflow, and wait for the user's reply before continuing.

After user confirms upgrade, **must first sync the workflow and phase fields** before entering full flow:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" set <name> workflow full
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" set <name> phase Blueprint
```

Then on current change basis, supplement Design Doc: **Immediately use the Skill tool to load the `superspec-Blueprint` skill**, proceed normally with full workflow. If user does not confirm upgrade, stop tweak and report that current change has exceeded tweak scope.

---

## Exit Conditions

- Small change completed, tests pass
- Change archived
- No new capability, architecture adjustments or interface changes
- **Phase guard**: Before Forge → Refine run `"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Forge --apply`; before Refine → Deliver follow `/superspec-Refine` and run `"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Refine --apply`

## Automatic Handoff to Next Phase

> **Terminology distinction**: phase guard `--apply` advances the `state.yaml` `phase` field. This step **always happens** and is not controlled by `auto_transition`. This section's "automatic handoff" only controls whether to automatically invoke the next skill.

After each phase guard or state transition advances phase, run:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" next <name>
```

The script determines the next action from `phase`, `workflow`, and `auto_transition`:
- `NEXT: auto` -> invoke the `SKILL` target to continue the tweak flow (`phase: Forge` returns `superspec-tweak`, `Refine` returns `superspec-Refine`, `Deliver` returns `superspec-Deliver`)
- `NEXT: manual` -> do not invoke the next skill; follow `HINT` and ask the user to run `/<SKILL>` manually
- `NEXT: done` -> workflow is complete; no further action needed
