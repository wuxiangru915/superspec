# Superspec Reference Appendix

## state.yaml Field Reference

```yaml
workflow: full
phase: Forge
blueprint_doc: .superspec/blueprints/YYYY-MM-DD-topic-blueprint.md
plan: .superspec/forge/YYYY-MM-DD-feature.md
base_ref: a1b2c3d4e5f6...
build_mode: subagent-driven-development
build_pause: null
subagent_dispatch: confirmed
tdd_mode: tdd
isolation: branch
refine_mode: light
refine_result: pending
verification_report: null
branch_status: pending
created_at: 2026-05-26
verified_at: null
archived: false
```

| Field | Meaning |
|-------|---------|
| `workflow` | `full`, `hotfix`, or `tweak` |
| `phase` | Current phase: `Vision`, `Blueprint`, `Forge`, `Refine`, `Deliver` |
| `blueprint_doc` | Associated Superspec Design Doc path |
| `plan` | Associated Superspec Plan path |
| `base_ref` | Git commit SHA recorded at ignite |
| `build_mode` | `subagent-driven-development`, `executing-plans`, or `direct` |
| `build_pause` | `null` or `plan-ready` |
| `subagent_dispatch` | `null` or `confirmed` |
| `tdd_mode` | `tdd` or `direct` |
| `isolation` | `branch` or `worktree` |
| `refine_mode` | `light` or `full` |
| `auto_transition` | `true` or `false` |
| `refine_result` | `pending`, `pass`, or `fail` |
| `verification_report` | Verification report file path |
| `branch_status` | `pending` or `handled` |
| `created_at` | Change creation date |
| `verified_at` | Verification pass time |
| `archived` | Whether change is archived |

## Script Boilerplate

```bash
SUPERSPEC_ENV="${SUPERSPEC_ENV:-$(find . "$HOME"/.*/skills "$HOME/.config" "$HOME/.gemini" -path '*/superspec/scripts/superspec-env.sh' -type f -print -quit 2>/dev/null)}"
if [ -z "$SUPERSPEC_ENV" ]; then
  echo "ERROR: superspec-env.sh not found. Ensure the superspec skill is installed." >&2
  return 1
fi
. "$SUPERSPEC_ENV"

# Stop workflow when script location fails
if [ -z "$SUPERSPEC_GUARD" ] || [ -z "$SUPERSPEC_STATE" ] || [ -z "$SUPERSPEC_HANDOFF" ] || [ -z "$SUPERSPEC_ARCHIVE" ]; then
  echo "ERROR: Superspec scripts not found. Ensure the superspec skill is installed." >&2
  return 1
fi
```

## File Structure

```
openspec/                              # Superspec — WHAT
├── config.yaml
├── changes/
│   ├── <name>/                        # Active change
│   │   ├── .openspec.yaml
│   │   ├── state.yaml
│   │   ├── intent.md
│   │   ├── blueprint.md
│   │   ├── specs/<capability>/spec.md
│   │   └── roadmap.md
│   └── Deliver/YYYY-MM-DD-<name>/
└── specs/<capability>/spec.md

docs/superpowers/                      # Superspec — HOW
├── specs/YYYY-MM-DD-<topic>-blueprint.md
└── plans/YYYY-MM-DD-<feature>.md
```
