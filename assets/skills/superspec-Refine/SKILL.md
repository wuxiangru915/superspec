---
name: superspec-Refine
description: "Superspec Phase 4: Verify and Close. Invoke with /superspec-Refine. Verify implementation matches Blueprint, handle development branch."
---

# Superspec Phase 4: Verify and Close (Verify)

## Prerequisites

- Code committed (Phase 3 complete)
- All roadmap.md tasks completed

## Steps

### 0a. Output Language Constraint

Verification reports and branch-handling notes must use the language of the user request that triggered this workflow.

### 0b. Entry State Verification (Entry Check)

Execute entry verification:

```bash
SUPERSPEC_ENV="${SUPERSPEC_ENV:-$(find . "$HOME"/.*/skills "$HOME/.config" "$HOME/.gemini" -path '*/superspec/scripts/superspec-env.sh' -type f -print -quit 2>/dev/null)}"
if [ -z "$SUPERSPEC_ENV" ]; then
  echo "ERROR: superspec-env.sh not found. Ensure the superspec skill is installed." >&2
  return 1
fi
. "$SUPERSPEC_ENV"
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" check <change-name> Refine
```

Proceed to Step 1 after verification passes. The script outputs specific failure reasons when verification fails.

**Idempotency**: All Refine phase checks can be safely re-executed. If `refine_result` is already `pass` and `branch_status` is `handled`, verification is complete — execute guard to transition. If `refine_result` is `pending`, start verification from the beginning.

### 1. Scale Assessment

Execute scale assessment:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" scale <change-name>
```

The script automatically counts tasks, delta spec count, changed file count, determines light or full verification mode, and sets the refine_mode field. Decision rule (any condition triggers full): tasks > 3, delta spec capabilities > 1, changed files > 4.

Before verification begins, handle uncommitted changes through `superspec/reference/dirty-worktree.md` protocol. Verify phase special handling:

1. If dirty diff belongs to current change and involves implementation, tests, tasks, delta spec, or Blueprint doc changes, do not fix or commit directly in Refine phase; report failures and enter Step 1b verification failure decision blocking point
2. If dirty diff is only Refine phase artifacts (e.g., verification report draft, branch handling records), may continue and record state in Refine phase
3. If dirty diff shows implementation but roadmap.md not checked, treat as Forge state lag; report failures and enter Step 1b, let user decide to roll back for fix or accept deviation

Only after user chooses fix, allow rollback to Forge phase:

```bash
# Execute only after user confirms fix
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" transition <change-name> Refine-fail
```

Note: When Refine-fail rolls back to Forge, `branch_status` is not reset. If branch handling was already completed during the first Refine attempt, skip the branch handling step on re-Refine and keep the existing `branch_status: handled`.

Note: If every task in Forge phase was committed, the script's file count based on working tree diff may underestimate change scale. In this case, must read plan file header `base-ref` and Refine with commit range:

```bash
PLAN=$("$SUPERSPEC_BASH" "$SUPERSPEC_STATE" get <change-name> plan)
BASE_REF=$(grep '^base-ref:' "$PLAN" 2>/dev/null | head -1 | sed 's/^base-ref: *//')
git diff --stat "$BASE_REF"...HEAD
```

If commit range shows changes exceed lightweight threshold (> 4 files, cross-module coordination, or delta spec spans more than 1 capability), manually set to full verification:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" set <change-name> refine_mode full
```

**Override mechanism**: If the agent or user believes the automated assessment is inappropriate, override at any time with `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" set <change-name> refine_mode <light|full>`.

### 1b. Verification Failure Decision (Blocking Point)

When verification does not pass, **must use the current platform's available user input/confirmation mechanism to pause and wait for the user to decide whether to fix or accept the deviation**. Must not automatically run `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" transition <change-name> Refine-fail`, nor automatically invoke `/superspec-Forge`. If the current platform has no structured question tool, ask fix/accept-deviation options in the conversation, stop the workflow, and wait for the user's reply before continuing.

When pausing, must list:
- Failed items
- Whether CRITICAL (Forge failure, test failure, security issues, core acceptance scenario failure)
- Recommended handling approach

**Uncertainty principle**: When severity is unclear, downgrade (SUGGESTION > WARNING > CRITICAL). Only use CRITICAL for Forge failures, test failures, and security issues; ambiguous or uncertain issues should be WARNING or SUGGESTION.

After user selection, continue as follows:
- **Fix all**: Run `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" transition <change-name> Refine-fail`, then invoke `/superspec-Forge` to fix
- **Handle item by item**: CRITICAL failures must be fixed; non-CRITICAL failures may choose to accept deviation, but must record acceptance reason and impact scope in verification report. If any CRITICAL failure exists, skipping fix to accept all is not allowed

**Retry limit**: After 3 consecutive Refine-fail cycles, on the 4th failure the agent must not automatically choose to continue fixing; **must use the current platform's available user input/confirmation mechanism to pause** with only two options: "Accept all deviations and record" or "Continue fixing", for the user to explicitly decide.

### 2. Artifact Context Loading (Hash On-Demand Read)

When verification needs to read Superspec artifacts, first check whether they have changed since the Blueprint phase:

```bash
RECORDED_HASH=$("$SUPERSPEC_BASH" "$SUPERSPEC_STATE" get <change-name> handoff_hash)
CURRENT_HASH=$("$SUPERSPEC_BASH" "$SUPERSPEC_HANDOFF" <change-name> --hash-only 2>/dev/null || echo "")
```

- If `RECORDED_HASH` = `CURRENT_HASH` and both are non-empty and neither is `null`: Superspec artifacts are unchanged. **roadmap.md does not need to be re-read in full** (use `grep -c '\- \[ \]' roadmap.md` to confirm completion count). intent.md, blueprint.md, and delta specs must still be read for comparison checks.
- If `RECORDED_HASH` is empty, is `null`, or differs from `CURRENT_HASH`: artifacts have changed or hash was never recorded. Read all required files in full normally.

This optimization only skips re-reading roadmap.md in full. intent.md and blueprint.md contain the full context needed for verification checks and must not be skipped due to hash match.

**Immediately execute:** Use the Skill tool to load the Superspec `verification-before-completion` skill. Skipping this step is prohibited.

After the skill loads, follow the `refine_mode` branch:

### 2a. Lightweight Verification (Small Changes)

Run these 5 checks:

1. All roadmap.md tasks completed `[x]`
2. Changed files match roadmap.md descriptions (`git diff --stat` / `git diff --cached --stat` / `git diff --stat <base-ref>...HEAD` compared against tasks content)
3. Build passes (run project-specific build command, e.g., `npm run build`, `mvn compile`, `cargo build`, etc.)
4. Related tests pass
5. No obvious security issues (no hardcoded keys, no new unsafe operations)

**Pass criteria**: All 5 items OK, no CRITICAL issues.

**When not passing**: Report failures, enter Step 1b verification failure decision blocking point. Only after user confirms fix, execute the following command to record failure and roll back to Forge phase, then invoke `/superspec-Forge` to fix:

```bash
# Execute only after user confirms fix
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" transition <change-name> Refine-fail
```

**Report format**: Brief table listing 5 check results + PASS/FAIL.

**Skipped items** (not checked in lightweight verification):
- spec scenario coverage
- Blueprint doc consistency deep comparison
- code pattern consistency suggestions
- delta spec and Blueprint doc drift detection

### 2b. Full Verification (Large Changes)

When scale assessment result is "large":

**Immediately execute:** Use the Skill tool to load the `openspec-Refine-change` skill. Skipping this step is prohibited.

After the skill loads, follow its guidance to Refine. Check items:
1. All roadmap.md tasks completed (`[x]`)
2. Implementation matches `.superspec/missions/<name>/blueprint.md` high-level Blueprint decisions
3. Implementation matches Design Doc (technical Blueprint documents under `.superspec/blueprints/`)
4. All capability spec scenarios pass
5. intent.md goals are satisfied
6. No contradictions between delta spec and Blueprint doc (if Build phase had incremental spec modifications, check if Blueprint doc has corresponding records)
7. Associated Blueprint documents under `.superspec/blueprints/` are locatable (file exists and is related to current change)

When verification does not pass: report missing items, enter Step 1b verification failure decision blocking point. Only after user confirms fix, execute the following command to record failure and roll back to Forge phase, then invoke `/superspec-Forge` to supplement:

```bash
# Execute only after user confirms fix
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" transition <change-name> Refine-fail
```

**Spec Drift Handling** (user decision point):
- If check item 6 finds contradictions (delta spec has content but Blueprint doc does not reflect it), **must use the current platform's available user input/confirmation mechanism as a single-select question to pause and wait for the user to choose the handling method**; must not select automatically. Options:
  - Option A: Append "Implementation Divergence" section to Blueprint doc recording deviation reason. Option A is a Refine phase allowed artifact; after writing, must not re-trigger Step 1b dirty-worktree decision due to that Blueprint doc change
  - Option B: After user selects B, run `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" transition <change-name> Refine-fail`, then invoke `/superspec-Forge`; `/superspec-Forge`'s Spec Incremental Update rules will load the Superspec `brainstorming` skill to sync Design Doc + delta spec
  - Option C: Confirm deviation is acceptable, continue verification (Blueprint doc will be marked as `superseded-by-main-spec` during archiving)

### 3. Finishing (Superspec)

**Immediately execute:** Use the Skill tool to load the Superspec `finishing-a-development-branch` skill. Skipping this step is prohibited.

If the Superspec `finishing-a-development-branch` skill is unavailable, stop the process and prompt to install or enable Superspec skills. Do not substitute this step with normal conversation.

After the skill loads, follow its guidance to finish. Branch handling options:
1. Merge to main branch locally
2. Push and create PR
3. Keep branch (handle later)
4. Discard work

This is a user decision point. **Must use the current platform's available user input/confirmation mechanism to pause and wait for the user to choose branch handling method**. Must not select based on recommendations, defaults, or current branch gauge. If the current platform has no structured question tool, ask branch-handling options in the conversation, stop the workflow, and wait for the user's reply before continuing. Only after the user completes selection and the corresponding operation finishes, may `branch_status: handled` be written.

**Confirmation items**:
- All tests pass
- No hardcoded keys or security issues

### 4. Record Verification Evidence

Verification report must be saved to disk and recorded in `state.yaml`; after branch handling completes, state fields must also be written. Do not manually set `refine_result: pass`; use guard for auto-transition.

```bash
mkdir -p docs/superpowers/reports
# Write verification conclusions to report file, e.g.:
# docs/superpowers/reports/YYYY-MM-DD-<change-name>-Refine.md

"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" set <change-name> verification_report docs/superpowers/reports/YYYY-MM-DD-<change-name>-Refine.md
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" set <change-name> branch_status handled
```

## Exit Conditions

- Verification report passed
- Branch handled
- `verification_report` in `state.yaml` points to an existing verification report file
- `branch_status: handled` in `state.yaml`
- **Phase guard**: Run `"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Refine --apply`; after all PASS, auto-transitions to `phase: Deliver` through `superspec-state transition Refine-pass`

After both verification and branch handling are complete, run guard for auto-transition:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Refine --apply
```

State file auto-updates to `phase: Deliver`, `refine_result: pass`, `verified_at: YYYY-MM-DD`.

## Automatic Handoff to Next Phase

> **Terminology distinction**: the "phase advancement" above is performed by guard `--apply`, which updates the `state.yaml` `phase` field. This step **always happens** and is not controlled by `auto_transition`. This section's "automatic handoff" only controls whether to automatically invoke the next skill.

After verification and branch handling are complete, and guard-based phase advancement has completed, run:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" next <change-name>
```

The script determines the next action from `phase`, `workflow`, and `auto_transition`:
- `NEXT: auto` -> invoke the `SKILL` target to continue to the next phase
- `NEXT: manual` -> do not invoke the next skill; follow `HINT` and ask the user to run `/<SKILL>` manually
- `NEXT: done` -> workflow is complete; no further action needed

Note: after `superspec-Deliver` starts, it must first execute the final Deliver confirmation blocking point and wait for the user to explicitly choose "Confirm Deliver" before running the Deliver script. Must not automatically Deliver just because verification passed.

## Context Compaction Recovery

The Refine phase may trigger context compaction. To recover, first run:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" check <change-name> Refine --recover
```

The script outputs structured recovery context (phase, verification gauge, branch gauge, recovery action). Follow the Recovery action to determine next step.
