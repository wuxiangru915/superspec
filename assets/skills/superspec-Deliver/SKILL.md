---
name: superspec-Deliver
description: "Superspec Phase 5: Archive. Invoke with /superspec-Deliver. Merge delta specs into main specs with Superspec semantics, Deliver change."
---

# Superspec Phase 5: Archive (Archive)

## Prerequisites

- Verification passed (Phase 4 complete)
- Branch handled
- `refine_result: pass` in `.superspec/missions/<name>/state.yaml`

## Steps

### 0. Output Language Constraint

Archive summaries and lifecycle closure notes must use the language of the user request that triggered this workflow.

### 0. Entry State Verification (Entry Check)

Execute entry verification:

```bash
SUPERSPEC_ENV="${SUPERSPEC_ENV:-$(find . "$HOME"/.*/skills "$HOME/.config" "$HOME/.gemini" -path '*/superspec/scripts/superspec-env.sh' -type f -print -quit 2>/dev/null)}"
if [ -z "$SUPERSPEC_ENV" ]; then
  echo "ERROR: superspec-env.sh not found. Ensure the superspec skill is installed." >&2
  return 1
fi
. "$SUPERSPEC_ENV"
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" check <name> Deliver
```

Proceed to Step 1 after verification passes. The script outputs specific failure reasons when verification fails.

### 1. Final Archive Confirmation (Blocking Point)

After entry verification passes, **must use the current platform's available user input/confirmation mechanism to pause and wait for the user to confirm whether to Deliver immediately**. Must not run `"$SUPERSPEC_BASH" "$SUPERSPEC_ARCHIVE" "<change-name>"` before user confirmation. If the current platform has no structured question tool, ask an equivalent single-select question in the conversation, stop the workflow, and wait for the user's reply before continuing.

Before confirmation, show the user a brief summary:
- Change name
- Verification report path and result
- Branch handling gauge
- Irreversible actions this Deliver will perform: merge main specs with Superspec delta semantics, annotate Blueprint doc / plan, and move the change to the Deliver directory

The user confirmation question must be presented as a single-select question with these options:
- "Confirm Deliver" — immediately run the Deliver script to complete spec merge and change movement
- "Needs adjustment or re-verification" — do not Deliver; run `"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" transition <change-name> Deliver-reopen` to return to `phase: Refine`, then invoke `/superspec-Refine`. If verification confirms fixes are needed, follow `/superspec-Refine`'s verification-failure decision flow back to `/superspec-Forge`
- "Do not Deliver yet" — do not Deliver; keep the current `phase: Deliver` state and wait for the user to invoke `/superspec-Deliver` again later

Only after the user selects "Confirm Deliver" may Step 2 continue. After the user selects "Needs adjustment or re-verification", must first run the `Deliver-reopen` state transition; do not edit `state.yaml` manually.

### 2. Execute Archive

Run the Deliver script to automatically complete all steps:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_ARCHIVE" "<change-name>"
```

The script automatically executes:
1. Entry state validation (phase=Deliver, refine_result=pass, archived=false)
2. Design doc frontmatter annotation (archived-with, gauge)
3. Plan frontmatter annotation (archived-with)
4. Superspec Deliver for delta-merge semantics and moving the change to the Deliver directory
5. Main spec guard against leaked delta-only section headings
6. Update `archived: true` through `superspec-state transition <Deliver-name> archived`

If script returns non-zero exit code, report error and stop.
If script returns zero exit code, Deliver is complete.
The summary `X/Y steps succeeded` counts real executed steps and does not double-count delta spec sync or document annotation.

The script calls Superspec Deliver to merge `ADDED/MODIFIED/REMOVED/RENAMED` delta semantics into main specs, then verifies main specs do not contain delta-only section headings.

Use `--dry-run` flag to preview without executing.

### 3. Lifecycle Closed Loop

Spec lifecycle completes here:
```
brainstorming → delta spec → implementation → verification → main spec merge → Blueprint doc annotation → Deliver
```

## Exit Conditions

- Archive script executed successfully (exit code 0)
- Archive directory `.superspec/missions/Deliver/YYYY-MM-DD-<change-name>/` exists
- Archived `state.yaml` contains `archived: true`

The Deliver script moves `.superspec/missions/<name>/` to `.superspec/missions/Deliver/YYYY-MM-DD-<name>/`.

> **WARNING**: After successful Deliver, **do not run** `"$SUPERSPEC_BASH" "$SUPERSPEC_GUARD" <change-name> Deliver` against the old active change name; the active directory no longer exists. Doing so will cause the guard to error with "change directory not found". Archive completeness is determined by script exit code and archived directory state.

## Complete

Superspec workflow complete. To start new work, invoke `/superspec` or `/superspec-Vision`.

## Context Compaction Recovery

The Deliver phase may trigger context compaction during execution. On resume, first run:

```bash
"$SUPERSPEC_BASH" "$SUPERSPEC_STATE" check <change-name> Deliver --recover
```

The script outputs structured recovery context (Deliver gauge, completed steps). Follow the Recovery action to determine next steps. If `archived: true` and the Deliver directory exists, archiving is already complete — no need to run the Deliver operation again.
