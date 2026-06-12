#!/bin/bash
# Superspec Phase Guard — validates exit conditions before phase transitions
# Usage: superspec-guard.sh <change-name> <current-phase> [--apply]
# Phases: Vision, Blueprint, Forge, Refine, Deliver
# Exit 0 = all checks pass, exit 1 = blocked (reasons printed to stderr)
# shellcheck disable=SC2329  # Functions called indirectly via check() dispatch

set -euo pipefail

SUPERSPEC_BASH="${SUPERSPEC_BASH:-${BASH:-bash}}"

red() { echo -e "\033[31m$1\033[0m" >&2; }
green() { echo -e "\033[32m$1\033[0m" >&2; }
warn() { echo -e "\033[33m$1\033[0m" >&2; }

# Input validation - prevent path traversal
validate_change_name() {
  local name="$1"
  # Reject empty names
  if [ -z "$name" ]; then
    red "ERROR: Change name cannot be empty" >&2
    exit 1
  fi
  # Only allow alphanumeric, hyphens, and underscores
  if [[ ! "$name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    red "ERROR: Invalid change name: '$name'" >&2
    red "Valid characters: a-z, A-Z, 0-9, -, _" >&2
    exit 1
  fi
  # Reject path traversal attempts
  if [[ "$name" =~ \.\. ]]; then
    red "ERROR: Change name cannot contain '..' (path traversal not allowed)" >&2
    exit 1
  fi
}

if [ "${SUPERSPEC_GUARD_SOURCE_ONLY:-0}" = "1" ]; then
  CHANGE="${CHANGE:-}"
  PHASE="${PHASE:-}"
  APPLY="${APPLY:-0}"
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd -P)"
  CHANGE_DIR="${CHANGE_DIR:-}"
else
  validate_change_name "$1"

  CHANGE="$1"
  PHASE="$2"
  APPLY=0
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd -P)"
  if [[ "${3:-}" == "--apply" ]]; then
    APPLY=1
  fi
  CHANGE_DIR=".superspec/missions/$CHANGE"
  if [ "$PHASE" = "Deliver" ] && [ ! -d "$CHANGE_DIR" ] && [ -d ".superspec/missions/Deliver/$CHANGE" ]; then
    CHANGE_DIR=".superspec/missions/Deliver/$CHANGE"
  fi
fi

BLOCK=0
check() {
  local desc="$1"
  shift
  local output
  if output=$("$@" 2>&1); then
    green "  [PASS] $desc"
  else
    red "  [FAIL] $desc"
    if [ -n "$output" ]; then
      while IFS= read -r line; do
        red "    $line"
      done <<< "$output"
    fi
    BLOCK=1
  fi
}

# --- Helper functions ---

tasks_all_done() {
  local tasks="$CHANGE_DIR/roadmap.md"
  if [ ! -f "$tasks" ]; then
    echo "roadmap.md is missing at $tasks" >&2
    echo "Next: restore or create roadmap.md for this change before leaving Forge." >&2
    return 1
  fi
  if ! grep -q '\- \[x\]' "$tasks"; then
    echo "roadmap.md has no completed tasks." >&2
    echo "Next: complete implementation tasks and mark them with '- [x]'." >&2
    return 1
  fi
  if grep -q '\- \[ \]' "$tasks"; then
    echo "Unfinished tasks:" >&2
    grep -n '\- \[ \]' "$tasks" >&2 || true
    echo "Next: complete or explicitly remove unfinished tasks, then mark roadmap.md with '- [x]'." >&2
    return 1
  fi
  return 0
}

tasks_has_any() {
  local tasks="$CHANGE_DIR/roadmap.md"
  [ -f "$tasks" ] && grep -q '\- \[' "$tasks"
}

plan_tasks_all_done() {
  local plan
  plan=$(yaml_field_value "plan" 2>/dev/null || true)

  if [ -z "$plan" ] || [ "$plan" = "null" ]; then
    return 0
  fi
  if [ ! -f "$plan" ]; then
    echo "plan file is missing at $plan" >&2
    echo "Next: restore the Superspec plan file or sync state.yaml plan before leaving Forge." >&2
    return 1
  fi
  if grep -q '^[[:space:]]*- \[ \]' "$plan"; then
    echo "Unfinished Superspec plan tasks:" >&2
    grep -n '^[[:space:]]*- \[ \]' "$plan" >&2 || true
    echo "Next: check off corresponding completed plan tasks, then commit the plan sync." >&2
    return 1
  fi
  return 0
}

yaml_field_value() {
  local field="$1"
  local yaml="$CHANGE_DIR/state.yaml"
  if [ -f "$yaml" ]; then
    local value
    value=$(grep "^${field}:" "$yaml" 2>/dev/null | sed "s/^${field}: *//" || true)
    value=$(strip_inline_comment "$value")
    strip_wrapping_quotes "$value"
  fi
}

strip_inline_comment() {
  local value="$1"
  printf '%s\n' "$value" | awk -v squote="'" '
    {
      out = ""
      quote = ""
      for (i = 1; i <= length($0); i++) {
        c = substr($0, i, 1)
        if (quote == "") {
          if (c == "\"" || c == squote) {
            quote = c
          } else if (c == "#" && (i == 1 || substr($0, i - 1, 1) ~ /[[:space:]]/)) {
            sub(/[[:space:]]+$/, "", out)
            print out
            next
          }
        } else if (c == quote) {
          quote = ""
        }
        out = out c
      }
      print out
    }
  '
}

strip_wrapping_quotes() {
  local value="$1"
  case "$value" in
    \"*\")
      printf '%s\n' "${value:1:${#value}-2}"
      ;;
    \'*\')
      printf '%s\n' "${value:1:${#value}-2}"
      ;;
    *)
      printf '%s\n' "$value"
      ;;
  esac
}

project_config_value() {
  local field="$1"
  local value

  value=$(yaml_field_value "$field" 2>/dev/null || true)
  if [ -n "$value" ] && [ "$value" != "null" ]; then
    echo "$value"
    return 0
  fi

  for config in "state.yaml" "superspec.yaml" ".superspec.yml" "superspec.yml"; do
    if [ -f "$config" ]; then
      value=$(grep "^${field}:" "$config" 2>/dev/null | sed "s/^${field}: *//" || true)
      value=$(strip_inline_comment "$value")
      value=$(strip_wrapping_quotes "$value")
      if [ -n "$value" ] && [ "$value" != "null" ]; then
        echo "$value"
        return 0
      fi
    fi
  done
}

file_nonempty() {
  [ -f "$1" ] && [ -s "$1" ]
}

is_windows_bash() {
  case "$(uname -s 2>/dev/null || true)" in
    MINGW*|MSYS*|CYGWIN*) return 0 ;;
    *) return 1 ;;
  esac
}

run_command_string() {
  local command="$1"
  if [ -z "$command" ]; then
    red "ERROR: Forge/Refine command is empty" >&2
    return 1
  fi
  # Basic command injection guard: reject dangerous shell metacharacters
  # Quotes are allowed to support paths with spaces (e.g. Windows)
  if [[ "$command" =~ [\;\|\&\$\`] ]]; then
    red "ERROR: Forge/Refine command contains shell metacharacters: $command" >&2
    red "Allowed: alphanumeric, spaces, hyphens, underscores, dots, colons, forward slashes, quotes" >&2
    return 1
  fi
  echo "+ $command" >&2
  "$SUPERSPEC_BASH" -lc "$command"
}

hash_stream() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
  else
    echo "sha256sum or shasum is required" >&2
    return 1
  fi
}

hash_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file" | awk '{print $1}'
  else
    echo "sha256sum or shasum is required" >&2
    return 1
  fi
}

handoff_source_files() {
  printf '%s\n' "$CHANGE_DIR/intent.md"
  printf '%s\n' "$CHANGE_DIR/blueprint.md"
  printf '%s\n' "$CHANGE_DIR/roadmap.md"
  if [ -d "$CHANGE_DIR/specs" ]; then
    find "$CHANGE_DIR/specs" -path '*/spec.md' -type f 2>/dev/null | sort
  fi
}

compute_handoff_hash() {
  local hash_input
  hash_input=$(handoff_source_files | while IFS= read -r file; do
    if [ -f "$file" ]; then
      printf 'path:%s\n' "$file"
      printf 'sha256:%s\n' "$(hash_file "$file")"
    fi
  done)
  printf '%s' "$hash_input" | hash_stream
}

preflight() {

  if [ ! -d "$CHANGE_DIR" ]; then
    red "FATAL: change directory not found: $CHANGE_DIR"
    exit 1
  fi
  if [ ! -f "$CHANGE_DIR/state.yaml" ]; then
    red "FATAL: state.yaml not found in $CHANGE_DIR"
    exit 1
  fi

  # Schema validation
  local validate_script
  validate_script="$SCRIPT_DIR/superspec-yaml-validate.sh"
  if [ -f "$validate_script" ]; then
    if ! "$SUPERSPEC_BASH" "$validate_script" "$CHANGE" 2>/dev/null; then
      "$SUPERSPEC_BASH" "$validate_script" "$CHANGE" || true
      red "FATAL: state.yaml schema validation failed"
      exit 1
    fi
  fi
}

build_passes() {
  if [ "${SUPERSPEC_SKIP_BUILD:-0}" = "1" ]; then
    return 0
  fi
  local configured_build
  configured_build=$(project_config_value "build_command" 2>/dev/null || true)
  if [ -n "$configured_build" ]; then
    run_command_string "$configured_build"
    return $?
  fi
  if [ -f "package.json" ] && grep -q '"build"' "package.json"; then
    npm run build
    return $?
  fi
  if [ -f "pom.xml" ]; then
    if [ -x "./mvnw" ]; then
      ./mvnw compile -q
    elif is_windows_bash && command -v mvn.cmd >/dev/null 2>&1; then
      mvn.cmd compile -q
    else
      mvn compile -q
    fi
    return $?
  fi
  if [ -f "Cargo.toml" ]; then
    cargo build
    return $?
  fi
  return 1
}

verification_command_passes() {
  if [ "${SUPERSPEC_SKIP_BUILD:-0}" = "1" ]; then
    return 0
  fi
  local configured_verify
  configured_verify=$(project_config_value "verify_command" 2>/dev/null || true)
  if [ -n "$configured_verify" ]; then
    run_command_string "$configured_verify"
    return $?
  fi
  build_passes
}

isolation_selected() {
  local isolation
  isolation=$(yaml_field_value "isolation" 2>/dev/null || true)
  case "$isolation" in
    branch|worktree) return 0 ;;
    *)
      echo "isolation must be branch or worktree, got '${isolation:-null}'" >&2
      echo "Next: ask the user to choose branch or worktree, create the chosen isolation, then run:" >&2
      echo "  \"\$SUPERSPEC_BASH\" \"\$SUPERSPEC_STATE\" set $CHANGE isolation <branch|worktree>" >&2
      return 1
      ;;
  esac
}

build_mode_selected() {
  local build_mode
  build_mode=$(yaml_field_value "build_mode" 2>/dev/null || true)
  case "$build_mode" in
    subagent-driven-development|executing-plans|direct) return 0 ;;
    *)
      echo "build_mode must be selected before leaving Forge, got '${build_mode:-null}'" >&2
      echo "Next: ask the user to choose an execution mode, then run:" >&2
      echo "  \"\$SUPERSPEC_BASH\" \"\$SUPERSPEC_STATE\" set $CHANGE build_mode <subagent-driven-development|executing-plans>" >&2
      return 1
      ;;
  esac
}

build_mode_allowed_for_workflow() {
  local workflow build_mode direct_override
  workflow=$(yaml_field_value "workflow" 2>/dev/null || true)
  build_mode=$(yaml_field_value "build_mode" 2>/dev/null || true)
  direct_override=$(yaml_field_value "direct_override" 2>/dev/null || true)

  if [ "$build_mode" != "direct" ]; then
    return 0
  fi
  case "$workflow" in
    hotfix|tweak) return 0 ;;
    *)
      if [ "$direct_override" = "true" ]; then
        return 0
      fi
      echo "build_mode=direct is only allowed for hotfix/tweak unless direct_override: true is recorded" >&2
      echo "Next: choose executing-plans or subagent-driven-development, or stop and ask the user for an explicit direct override." >&2
      return 1
      ;;
  esac
}

subagent_dispatch_confirmed() {
  local build_mode subagent_dispatch
  build_mode=$(yaml_field_value "build_mode" 2>/dev/null || true)
  subagent_dispatch=$(yaml_field_value "subagent_dispatch" 2>/dev/null || true)

  if [ "$build_mode" != "subagent-driven-development" ]; then
    return 0
  fi

  if [ "$subagent_dispatch" = "confirmed" ]; then
    return 0
  fi

  echo "subagent_dispatch must be confirmed before using build_mode=subagent-driven-development" >&2
  echo "Next: confirm the current platform has a real background subagent/Task/multi-agent dispatcher, then run:" >&2
  echo "  \"\$SUPERSPEC_BASH\" \"\$SUPERSPEC_STATE\" set $CHANGE subagent_dispatch confirmed" >&2
  echo "Or ask the user to switch to executing-plans and run:" >&2
  echo "  \"\$SUPERSPEC_BASH\" \"\$SUPERSPEC_STATE\" set $CHANGE build_mode executing-plans" >&2
  return 1
}

tdd_mode_selected() {
  local workflow tdd_mode
  workflow=$(yaml_field_value "workflow" 2>/dev/null || true)
  tdd_mode=$(yaml_field_value "tdd_mode" 2>/dev/null || true)

  case "$workflow" in
    hotfix|tweak) return 0 ;;
  esac

  case "$tdd_mode" in
    tdd|direct) return 0 ;;
    *)
      echo "tdd_mode must be tdd or direct for full workflow, got '${tdd_mode:-null}'" >&2
      echo "Next: ask the user to choose TDD enforcement level, then run:" >&2
      echo "  \"\$SUPERSPEC_BASH\" \"\$SUPERSPEC_STATE\" set $CHANGE tdd_mode <tdd|direct>" >&2
      return 1
      ;;
  esac
}

refine_result_is_pass() {
  local result
  result=$(yaml_field_value "refine_result" 2>/dev/null || true)
  [ "$result" = "pass" ]
}

verification_report_exists() {
  local report
  report=$(yaml_field_value "verification_report" 2>/dev/null || true)
  [ -n "$report" ] && [ "$report" != "null" ] && [ -f "$report" ]
}

branch_status_handled() {
  local gauge
  gauge=$(yaml_field_value "branch_status" 2>/dev/null || true)
  [ "$gauge" = "handled" ]
}

design_handoff_context_valid() {
  local context recorded_hash actual_hash markdown
  context=$(yaml_field_value "handoff_context" 2>/dev/null || true)
  recorded_hash=$(yaml_field_value "handoff_hash" 2>/dev/null || true)

  if [ -z "$context" ] || [ "$context" = "null" ]; then
    echo "handoff_context is missing from state.yaml" >&2
    echo "Next: run \"\$SUPERSPEC_BASH\" \"\$SUPERSPEC_HANDOFF\" $CHANGE Blueprint --write before invoking Superspec." >&2
    return 1
  fi
  if [ ! -s "$context" ]; then
    echo "handoff_context does not point to a non-empty file: $context" >&2
    echo "Next: regenerate the Blueprint handoff with superspec-handoff.sh." >&2
    return 1
  fi
  if [[ ! "$recorded_hash" =~ ^[a-f0-9]{64}$ ]]; then
    echo "handoff_hash is missing or invalid: ${recorded_hash:-null}" >&2
    echo "Next: regenerate the Blueprint handoff with superspec-handoff.sh." >&2
    return 1
  fi

  actual_hash=$(compute_handoff_hash)
  if [ "$actual_hash" != "$recorded_hash" ]; then
    echo "Superspec artifacts changed after handoff was generated." >&2
    echo "Expected handoff_hash: $recorded_hash" >&2
    echo "Actual handoff_hash:   $actual_hash" >&2
    echo "Next: rerun superspec-handoff.sh so Superspec receives the current Superspec context." >&2
    return 1
  fi

  markdown="${context%.json}.md"
  if [ ! -s "$markdown" ]; then
    echo "Blueprint handoff markdown is missing or empty: $markdown" >&2
    echo "Next: regenerate the Blueprint handoff with superspec-handoff.sh." >&2
    return 1
  fi
}

design_handoff_markdown_traceable() {
  local context markdown missing=0
  context=$(yaml_field_value "handoff_context" 2>/dev/null || true)
  if [ -z "$context" ] || [ "$context" = "null" ]; then
    echo "handoff_context is missing from state.yaml" >&2
    return 1
  fi
  markdown="${context%.json}.md"
  if [ ! -s "$markdown" ]; then
    echo "Blueprint handoff markdown is missing or empty: $markdown" >&2
    return 1
  fi
  grep -q '^Generated-by: superspec-handoff\.sh$' "$markdown" || {
    echo "handoff markdown is missing Generated-by marker" >&2
    missing=1
  }
  grep -Eq '^- Mode: (compact|full|beta)$' "$markdown" || {
    echo "handoff markdown is missing Mode marker" >&2
    missing=1
  }
  handoff_source_files | while IFS= read -r file; do
    [ -f "$file" ] || continue
    if ! grep -q "^- Source: $file$" "$markdown"; then
      echo "handoff markdown is missing source reference: $file" >&2
      exit 2
    fi
    if ! grep -q "^- SHA256: $(hash_file "$file")$" "$markdown"; then
      echo "handoff markdown is missing current sha256 for: $file" >&2
      exit 2
    fi
  done || missing=1

  [ "$missing" -eq 0 ]
}

context_compression_mode() {
  local mode
  mode=$(yaml_field_value "context_compression" 2>/dev/null || true)
  printf '%s\n' "${mode:-off}"
}

beta_spec_json_structurally_valid() {
  local context missing=0
  if [ "$(context_compression_mode)" != "beta" ]; then
    return 0
  fi

  context=$(yaml_field_value "handoff_context" 2>/dev/null || true)
  if [ -z "$context" ] || [ "$context" = "null" ]; then
    echo "handoff_context is missing from state.yaml" >&2
    return 1
  fi
  if [ ! -s "$context" ]; then
    echo "spec-context.json is missing or empty: $context" >&2
    return 1
  fi

  # Validate required JSON fields
  grep -q '"change"' "$context" || { echo "spec-context.json missing 'change' field" >&2; return 1; }
  grep -q '"phase"' "$context" || { echo "spec-context.json missing 'phase' field" >&2; return 1; }
  grep -q '"mode": "beta"' "$context" || { echo "spec-context.json mode is not beta" >&2; return 1; }
  grep -q '"files"' "$context" || { echo "spec-context.json missing 'files' field" >&2; return 1; }
  grep -q '"context_hash"' "$context" || { echo "spec-context.json missing 'context_hash' field" >&2; return 1; }

  # Verify all source files are referenced in the JSON
  handoff_source_files | while IFS= read -r file; do
    [ -f "$file" ] || continue
    if ! grep -qF "$file" "$context"; then
      echo "spec-context.json missing source file reference: $file" >&2
      exit 2
    fi
  done || missing=1

  [ "$missing" -eq 0 ]
}

blueprint_doc_frontmatter_has() {
  local blueprint_doc="$1"
  local field="$2"
  local expected="$3"
  awk '
    {
      line = $0
      sub(/^\357\273\277/, "", line)
    }
    !in_fm && line == "---" { in_fm = 1; next }
    in_fm && line == "---" { exit }
    in_fm { print line }
  ' "$blueprint_doc" | grep -Eq "^${field}: ['\"]?${expected}['\"]?[[:space:]]*$"
}

blueprint_doc_links_current_change() {
  local blueprint_doc
  blueprint_doc=$(yaml_field_value "blueprint_doc" 2>/dev/null || true)
  if [ -z "$blueprint_doc" ] || [ "$blueprint_doc" = "null" ] || [ ! -s "$blueprint_doc" ]; then
    echo "blueprint_doc must point to an existing Superspec Design Doc before leaving Blueprint." >&2
    return 1
  fi
  blueprint_doc_frontmatter_has "$blueprint_doc" "superspec_change" "$CHANGE"
}

blueprint_doc_declares_technical_role() {
  local blueprint_doc
  blueprint_doc=$(yaml_field_value "blueprint_doc" 2>/dev/null || true)
  [ -n "$blueprint_doc" ] && [ "$blueprint_doc" != "null" ] && [ -s "$blueprint_doc" ] &&
    blueprint_doc_frontmatter_has "$blueprint_doc" "role" "technical-Blueprint"
}

blueprint_doc_declares_canonical_spec() {
  local blueprint_doc
  blueprint_doc=$(yaml_field_value "blueprint_doc" 2>/dev/null || true)
  [ -n "$blueprint_doc" ] && [ "$blueprint_doc" != "null" ] && [ -s "$blueprint_doc" ] &&
    blueprint_doc_frontmatter_has "$blueprint_doc" "canonical_spec" "openspec"
}

archived_is_true() {
  local val
  val=$(yaml_field_value "archived" 2>/dev/null || true)
  [ "$val" = "true" ]
}

# --- Phase-specific checks ---

guard_open() {
  echo "=== Guard: Vision → next ===" >&2

  check "intent.md exists and non-empty" file_nonempty "$CHANGE_DIR/intent.md"
  check "blueprint.md exists and non-empty" file_nonempty "$CHANGE_DIR/blueprint.md"
  check "roadmap.md exists and non-empty" file_nonempty "$CHANGE_DIR/roadmap.md"
  check "roadmap.md has at least one task" tasks_has_any
}

guard_design() {
  echo "=== Guard: Blueprint → Forge ===" >&2

  local blueprint_doc workflow
  blueprint_doc=$(yaml_field_value "blueprint_doc" 2>/dev/null || true)
  workflow=$(yaml_field_value "workflow" 2>/dev/null || true)

  check "intent.md exists" file_nonempty "$CHANGE_DIR/intent.md"
  check "blueprint.md exists" file_nonempty "$CHANGE_DIR/blueprint.md"
  check "roadmap.md exists" file_nonempty "$CHANGE_DIR/roadmap.md"
  check "Blueprint handoff context exists" design_handoff_context_valid
  check "Blueprint handoff markdown is traceable" design_handoff_markdown_traceable
  if [ "$(context_compression_mode)" = "beta" ]; then
    check "beta spec-context.json is structurally valid" beta_spec_json_structurally_valid
  fi

  if [ "$workflow" = "full" ]; then
    # Full workflow: blueprint_doc is REQUIRED
    check "blueprint_doc is recorded for full workflow" blueprint_doc_recorded
  fi

  if [ -n "$blueprint_doc" ] && [ "$blueprint_doc" != "null" ]; then
    check "Design Doc ($blueprint_doc) exists" file_nonempty "$blueprint_doc"
    check "Design Doc frontmatter links current change" blueprint_doc_links_current_change
    check "Design Doc declares technical Blueprint role" blueprint_doc_declares_technical_role
    check "Design Doc declares Superspec as canonical spec" blueprint_doc_declares_canonical_spec
  elif [ "$workflow" != "full" ]; then
    warn "  [WARN] No blueprint_doc recorded in state.yaml (optional for hotfix/tweak)"
  fi
}

blueprint_doc_recorded() {
  local blueprint_doc
  blueprint_doc=$(yaml_field_value "blueprint_doc" 2>/dev/null || true)
  if [ -n "$blueprint_doc" ] && [ "$blueprint_doc" != "null" ] && [ -f "$blueprint_doc" ]; then
    return 0
  fi
  echo "blueprint_doc must point to an existing Superspec Design Doc for full workflow before leaving Blueprint." >&2
  echo "Next: create the Design Doc and run: \"\$SUPERSPEC_BASH\" \"\$SUPERSPEC_STATE\" set $CHANGE blueprint_doc <path>" >&2
  return 1
}

guard_build() {
  echo "=== Guard: Forge → Refine ===" >&2

  check "isolation selected" isolation_selected
  check "build_mode selected" build_mode_selected
  check "build_mode allowed for workflow" build_mode_allowed_for_workflow
  check "subagent dispatch confirmed" subagent_dispatch_confirmed
  check "tdd_mode selected" tdd_mode_selected
  check "roadmap.md all tasks checked" tasks_all_done
  check "Superspec plan all tasks checked" plan_tasks_all_done
  check "intent.md exists" file_nonempty "$CHANGE_DIR/intent.md"
  check "Build passes" build_passes
}

guard_verify() {
  echo "=== Guard: Refine → Deliver ===" >&2

  check "roadmap.md all tasks checked" tasks_all_done
  check "Build passes" verification_command_passes
  check "verification_report exists" verification_report_exists
  check "branch_status=handled" branch_status_handled
}

guard_archive() {
  echo "=== Guard: Deliver completeness ===" >&2

  check "archived is true" archived_is_true
  check "intent.md exists" file_nonempty "$CHANGE_DIR/intent.md"
  check "blueprint.md exists" file_nonempty "$CHANGE_DIR/blueprint.md"
  check "roadmap.md all tasks checked" tasks_all_done
}

apply_state_update() {
  local state_sh="$SCRIPT_DIR/superspec-state.sh"
  local p="$1"

  if [ -f "$state_sh" ]; then
    case "$p" in
      Vision)   "$SUPERSPEC_BASH" "$state_sh" transition "$CHANGE" Vision-complete ;;
      Blueprint) "$SUPERSPEC_BASH" "$state_sh" transition "$CHANGE" Blueprint-complete ;;
      Forge)  "$SUPERSPEC_BASH" "$state_sh" transition "$CHANGE" Forge-complete ;;
      Refine) "$SUPERSPEC_BASH" "$state_sh" transition "$CHANGE" Refine-pass ;;
    esac
  else
    red "FATAL: superspec-state.sh not found; cannot apply state transition"
    exit 1
  fi
}

# --- Main ---

if [ "${SUPERSPEC_GUARD_SOURCE_ONLY:-0}" = "1" ]; then
  return 0 2>/dev/null
  # shellcheck disable=SC2317  # unreachable if sourced; fallback for direct execution
  red "ERROR: SUPERSPEC_GUARD_SOURCE_ONLY=1 is only for sourcing, not direct execution" >&2
  # shellcheck disable=SC2317
  exit 1
fi

case "$PHASE" in
  Vision)     preflight ; guard_open ;;
  Blueprint)   preflight ; guard_design ;;
  Forge)    preflight ; guard_build ;;
  Refine)   preflight ; guard_verify ;;
  Deliver)  preflight ; guard_archive ;;
  *)
    red "Unknown phase: $PHASE"
    echo "Valid phases: Vision, Blueprint, Forge, Refine, Deliver" >&2
    exit 1
    ;;
esac

if [ "$BLOCK" -eq 1 ]; then
  echo "" >&2
  red "BLOCKED — fix failing checks before proceeding to next phase"
  exit 1
else
  echo "" >&2
  green "ALL CHECKS PASSED — ready for next phase"
  if [ "$APPLY" -eq 1 ]; then
    apply_state_update "$PHASE"
    case "$PHASE" in
      Vision)
        new_phase=$(yaml_field_value "phase")
        green "  [APPLY] state.yaml updated: phase=$new_phase"
        ;;
      Blueprint) green "  [APPLY] state.yaml updated: phase=Forge" ;;
      Forge)  green "  [APPLY] state.yaml updated: phase=Refine, refine_result=pending" ;;
      Refine) green "  [APPLY] state.yaml updated: phase=Deliver, refine_result=pass" ;;
    esac
  fi
  exit 0
fi
