---
name: superspec-hotfix
description: "Superspec preset path: Bug fix / hotfix. Skip brainstorming, directly Vision → Forge → Refine → Deliver. Applicable for behavior fixes, scenarios not involving new capability Blueprint."
---

# Superspec Preset Path: Hotfix

Quick bug fix workflow: Vision → Forge → Refine → Deliver. Skip brainstorming and full plan, applicable for behavior fixes not involving new capability Blueprint.

**Applicable conditions** (all must be met):
1. Fix bugs in existing functionality, no new capability
2. No interface changes or architecture adjustments
3. Change scope is predictable (usually ≤ 2 files)

**Not applicable**: If fix process discovers need for architecture adjustments, should upgrade to full `/superspec` workflow.

---

## Process (preset workflow, 6 steps)

### 0. Output Language Constraint

Streamlined Superspec artifacts must use the language of the user request that triggered this workflow.

Execution chain: Vision → Forge → root cause check → Refine → Deliver. Hotfix provides default decisions for each phase: streamlined Vision, direct Forge, root cause confirmation, scale-based verification, and final Deliver confirmation after verification passes.

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

Reuse Superspec Vision capability to create change, but use hotfix defaults: do not execute `openspec-explore` long exploration, directly enter streamlined change creation.

**Immediately execute:** Use the Skill tool to load the `openspec-new-change` skill. Skipping this step is prohibited.

After the skill loads, follow its guidance to create streamlined artifacts:
  - `intent.md` — problem description + root cause analysis + fix goal (no solution comparison needed)
  - `blueprint.md` — fix solution (one is enough, no multi-solution comparison needed)
  - `roadmap.md` — fix task list
- **No delta spec needed** (unless fix changes existing spec acceptance scenarios)

Initialize Superspec state file:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" ignite <name> hotfix
```

Verify initialized state:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" check <name> Vision
```

Run phase guard to transition Vision → Forge:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Vision --apply
```

Check `auto_transition` to decide whether to continue:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" next <name>
```

- `NEXT: auto` → continue to Step 2
- `NEXT: manual` → pause, follow `HINT` to prompt user to run `/<SKILL>` manually

### 2. Direct Build (preset Forge)

Use hotfix defaults: `build_mode: direct`. Skip Superspec `brainstorming` and `writing-plans` (unless tasks > 3; if exceeds 3 tasks, transfer to `/superspec-Forge`'s plan and execution method selection — note this does NOT trigger full workflow upgrade, only switches execution method).

Before continuing or starting changes, handle uncommitted changes through `superspec/reference/dirty-worktree.md`. If attribution shows the fix scope exceeds hotfix, handle it through this file's "Upgrade Conditions".

**Immediately execute:** Execute tasks one by one according to roadmap.md:

1. Read `.superspec/missions/<name>/roadmap.md`, get incomplete task list
2. For each incomplete task:
   - Modify code according to task description
   - Run project formatter (e.g., `mvn spotless:apply`, `npm run format`)
   - Run related tests to confirm pass
   - Check corresponding `- [ ]` to `- [x]` in roadmap.md
   - Commit code, commit message format: `fix: <brief fix description>`
3. After all tasks complete, explicitly run relevant project tests and build commands

**If fix affects existing spec acceptance scenarios**:
- Create delta spec in `.superspec/missions/<name>/specs/<capability>/spec.md`
- Only include `## MODIFIED Requirements` section

During hotfix execution, whenever a crash, unexpected behavior, test failure, or Forge failure appears while running the program, tests, Forge, or manual verification, must use the Skill tool to load the Superspec `systematic-debugging` skill. Before root-cause investigation is complete, must not propose or implement source-code fixes.

Handle it using the four-phase `systematic-debugging` flow:
- First reproduce and locate the root cause, read full errors, check recent changes, and trace data flow
- If root cause points to a source bug, first add a minimal failing test that reproduces the crash or unexpected behavior, then modify source code
- After the fix, run that failing test, related tests, and project Forge/verification commands to confirm all pass
- Keep the test, source fix, and roadmap.md checkoff inside the current change; must not replace the current change verification loop by starting a separate "write test cases" change

### 3. Root Cause Elimination Check

**Execute before running Forge guard**, ensuring the fix actually eliminates the root cause:

1. Read bug description and root cause in intent.md
2. Search and Refine problem code no longer exists
3. If root cause not eliminated, return to Step 2 to continue fix (still in Forge phase, no state transition needed)

**Upgrade conditions**:
- Root cause check reveals deep architecture issues → Stop hotfix, handle per "Upgrade Conditions" section
- Fix requires additional interface changes → Stop hotfix, handle per "Upgrade Conditions" section

After root cause is confirmed eliminated, run phase guard to transition Forge → Refine:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Forge --apply
```

State automatically updates to `phase: Refine`, `refine_result: pending`, then enter verification.

### 4. Verification (preset Refine)

Reuse `/superspec-Refine`, with superspec-Refine's scale assessment deciding lightweight or full verification.

**Immediately execute:** Use the Skill tool to load the `superspec-Refine` skill. Skipping this step is prohibited.

Small-scale hotfixes without delta spec usually meet lightweight verification conditions (≤ 3 tasks, ≤ 2 files), superspec-Refine's scale assessment will select lightweight verification path (5 quick checks). If hotfix created delta spec, enter full verification path according to superspec-Refine's scale assessment rules.

After verification passes, record `state.yaml` `refine_result` as `pass` according to `/superspec-Refine` rules, must not skip this gauge before archiving. After verification passes, still enter `/superspec-Deliver`'s final Deliver confirmation; do not automatically run the Deliver script.

### 5. Archive (preset Deliver)

Reuse `/superspec-Deliver`. Must satisfy `refine_result: pass` in `state.yaml` before archiving, and wait for `/superspec-Deliver`'s final Deliver confirmation.

**Immediately execute:** Use the Skill tool to load the `superspec-Deliver` skill to Deliver. Skipping this step is prohibited.
If there is delta spec, sync to main spec according to superspec-Deliver rules, and handle associated Design Doc and Plan archiving annotations.

---

## Continuous Execution Mode

<IMPORTANT>
Hotfix workflow is **one-time continuous execution**. After invoking `/superspec-hotfix`, agent must automatically advance through hotfix steps, without pausing to wait for user input mid-way.

Exception: when `state.yaml` has `auto_transition: false`, after each phase guard advances `phase`, do not auto-invoke the next skill. In this case, use `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" next <name>` output and pause for manual continuation as instructed.

The following situations must also pause and wait for user confirmation:

1. Encountering upgrade conditions (see "Upgrade Conditions" section). **Must use the current platform's available user input/confirmation mechanism to pause and wait for the user to explicitly confirm** upgrading to full workflow
2. workspace isolation and execution-method selection when tasks exceed 3 and transfer to `/superspec-Forge`
3. Refine phase (superspec-Refine) verification-failure and branch-handling decisions
4. Final Deliver confirmation (before superspec-Deliver runs the Deliver script)

Execution order: quick Vision → direct Forge → root cause check → verification → Deliver → complete

After each step completes, immediately enter next step. Within each phase, must still call corresponding Superspec/Superspec/Superspec skill according to above requirements; if the called skill has its own user decision points, follow that skill's rules.
</IMPORTANT>

---

## Upgrade Conditions

Upgrade to full `/superspec` when **any** of the following conditions are met:

| Condition | Explanation |
|-----------|-------------|
| Change involves **3+ files** | Exceeds single-point fix scope |
| Architecture changes | New modules, new interfaces, new dependencies |
| Database schema changes | Structural adjustments |
| Introduces new public API | Fix creates new external interface |
| Fix scope exceeds single function/module | Requires coordinated changes |

When upgrade conditions are met, **must use the current platform's available user input/confirmation mechanism to pause and wait for the user to explicitly confirm** upgrading to the full `/superspec` workflow. Do not directly enter `/superspec-Blueprint`, and do not automatically supplement Design Doc. If the current platform has no structured question tool, ask an upgrade confirmation question in the conversation, stop the workflow, and wait for the user's reply before continuing.

After user confirms upgrade, **must first sync the workflow and phase fields** before entering full flow:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" set <name> workflow full
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" set <name> phase Blueprint
```

Then on current change basis, supplement Design Doc: **Immediately use the Skill tool to load the `superspec-Blueprint` skill**, proceed normally with full workflow. If user does not confirm upgrade, stop hotfix and report that current change has exceeded hotfix scope.

---

## Exit Conditions

- Bug fixed, tests pass
- Change archived
- If spec changes, synced to main spec
- **Phase guard**: Before Forge → Refine run `"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Forge --apply`; before Refine → Deliver follow `/superspec-Refine` and run `"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Refine --apply`

## Automatic Handoff to Next Phase

> **Terminology distinction**: phase guard `--apply` advances the `state.yaml` `phase` field. This step **always happens** and is not controlled by `auto_transition`. This section's "automatic handoff" only controls whether to automatically invoke the next skill.

After each phase guard or state transition advances phase, run:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" next <name>
```

The script determines the next action from `phase`, `workflow`, and `auto_transition`:
- `NEXT: auto` -> invoke the `SKILL` target to continue the hotfix flow (`phase: Forge` returns `superspec-hotfix`, `Refine` returns `superspec-Refine`, `Deliver` returns `superspec-Deliver`)
- `NEXT: manual` -> do not invoke the next skill; follow `HINT` and ask the user to run `/<SKILL>` manually
- `NEXT: done` -> workflow is complete; no further action needed
