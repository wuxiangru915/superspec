#!/bin/bash
# superspec-hook-guard.sh — PreToolUse hook for Superspec phase enforcement
#
# Blocks file writes (Write/Edit) when the active Superspec change is in
# a phase that does not allow source code modifications (Vision/Blueprint/Deliver).
#
# Usage (called by harness, not directly):
#   PreToolUse matcher "Write|Edit" → this script
#   Stdin:  JSON  {"tool_name":"Write|Edit","tool_input":{"file_path":"..."}}
#   Exit 0  = allow
#   Exit 2  = blocked (stderr message shown to user)
#
# Cross-platform: macOS / Linux / Windows Git Bash
# shellcheck disable=SC2329

set -euo pipefail

# ── Extract target file path ──────────────────────────────────────

TARGET=""

# Method 1: FILE_PATH environment variable (set by some harnesses)
if [ -n "${FILE_PATH:-}" ]; then
  TARGET="$FILE_PATH"
fi

# Method 2: Parse stdin JSON
if [ -z "$TARGET" ]; then
  INPUT=""
  if [ ! -t 0 ]; then
    INPUT=$(cat 2>/dev/null || true)
  fi
  if [ -n "$INPUT" ]; then
    # Extract file_path value — works for both Write and Edit tool inputs
    TARGET=$(printf '%s' "$INPUT" \
      | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' 2>/dev/null \
      | head -1 \
      | sed 's/^"file_path"[[:space:]]*:[[:space:]]*"//' \
      | sed 's/"$//' \
      || true)
  fi
fi

# No target found — allow (not a file-path-bearing operation)
if [ -z "$TARGET" ]; then
  echo "[SUPERSPEC-HOOK] allowed: no file path in tool input" >&2
  exit 0
fi

# Normalize to forward slashes, collapse doubles from JSON escaping (\\ → //)
TARGET=$(printf '%s' "$TARGET" | sed 's|\\|/|g' | sed 's|///*|/|g')

# ── Find active Superspec change ─────────────────────────────────────

YAML_FILE=""
if [ -d ".superspec/missions" ]; then
  for dir in .superspec/missions/*/; do
    [ -d "$dir" ] || continue
    # Skip archived changes
    case "$dir" in
      */Deliver/*) continue ;;
    esac
    if [ -f "${dir}state.yaml" ]; then
      YAML_FILE="${dir}state.yaml"
      break
    fi
  done
fi

# No active change — allow all writes
if [ -z "$YAML_FILE" ]; then
  echo "[SUPERSPEC-HOOK] allowed: no active superspec change" >&2
  exit 0
fi

# ── Read current phase ───────────────────────────────────────────

PHASE=$(grep "^phase:" "$YAML_FILE" 2>/dev/null \
  | awk '{print $2}' \
  | tr -d '[:space:][:cntrl:]' \
  || true)

if [ -z "$PHASE" ]; then
  echo "[SUPERSPEC-HOOK] allowed: no phase in state.yaml" >&2
  exit 0
fi

# ── Resolve to project-relative path ─────────────────────────────

# Normalize helper: forward slashes only
norm() { printf '%s' "$1" | sed 's|\\|/|g'; }

RELPATH=$(norm "$TARGET")

# If already relative, use as-is
case "$RELPATH" in
  /*|[A-Za-z]:/*)
    # Absolute — try stripping CWD prefixes
    CWD_UNIX=$(norm "$(pwd)")
    CWD_PHYS=$(norm "$(pwd -P 2>/dev/null || pwd)")

    # Try: TARGET as-is vs CWD logical
    if [ "${RELPATH#"$CWD_UNIX"/}" != "$RELPATH" ]; then
      RELPATH="${RELPATH#"$CWD_UNIX"/}"
    # Try: TARGET as-is vs CWD physical (macOS /var → /private/var)
    elif [ "${RELPATH#"$CWD_PHYS"/}" != "$RELPATH" ]; then
      RELPATH="${RELPATH#"$CWD_PHYS"/}"
    else
      # Resolve TARGET's parent through filesystem (handles symlinked TARGET path)
      _PDIR=$(cd "$(dirname "$TARGET")" 2>/dev/null && pwd -P 2>/dev/null || true)
      if [ -n "$_PDIR" ]; then
        _TRESOLVED=$(norm "${_PDIR}/$(basename "$TARGET")")
        if [ "${_TRESOLVED#"$CWD_UNIX"/}" != "$_TRESOLVED" ]; then
          RELPATH="${_TRESOLVED#"$CWD_UNIX"/}"
        elif [ "${_TRESOLVED#"$CWD_PHYS"/}" != "$_TRESOLVED" ]; then
          RELPATH="${_TRESOLVED#"$CWD_PHYS"/}"
        fi
      fi
    fi
    ;;
esac

# ── Whitelist: phase-aware allowed paths ─────────────────────────

case "$RELPATH" in
  openspec/*)
    # Superspec artifacts — phase-aware sub-check
    case "$PHASE" in
      Vision)
        # Vision: allow proposal, Blueprint, tasks, yaml, handoff, specs
        case "$RELPATH" in
          */intent.md|*/blueprint.md|*/roadmap.md|*/.openspec.yaml|*/state.yaml|*/.superspec/*|*/specs/*)
            echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: Vision, openspec artifacts)" >&2
            exit 0
            ;;
        esac
        ;;
      Blueprint)
        # Blueprint: allow handoff, delta spec (Spec Patch), proposal/Blueprint/tasks (minor refinements), state.yaml
        case "$RELPATH" in
          */intent.md|*/blueprint.md|*/roadmap.md|*/.superspec/*|*/specs/*|*/state.yaml|*/.openspec.yaml)
            echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: Blueprint, handoff/spec)" >&2
            exit 0
            ;;
        esac
        ;;
      Forge)
        # Forge: allow delta spec (incremental sync), tasks, state.yaml
        case "$RELPATH" in
          */specs/*|*/roadmap.md|*/state.yaml|*/.openspec.yaml)
            echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: Forge, spec/tasks)" >&2
            exit 0
            ;;
        esac
        ;;
      Refine)
        # Refine: allow tasks (post-check), state.yaml
        case "$RELPATH" in
          */roadmap.md|*/state.yaml|*/.openspec.yaml)
            echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: Refine, tasks/state)" >&2
            exit 0
            ;;
        esac
        ;;
      Deliver)
        # Deliver: allow state.yaml state updates only
        case "$RELPATH" in
          */state.yaml|*/.openspec.yaml)
            echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: Deliver, state)" >&2
            exit 0
            ;;
        esac
        ;;
    esac
    ;;
  docs/superpowers/*)
    # Superspec artifacts — phase-aware sub-check
    case "$PHASE" in
      Blueprint)
        echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: Blueprint, superpowers)" >&2
        exit 0
        ;;
      Forge)
        echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: Forge, superpowers)" >&2
        exit 0
        ;;
      Refine)
        echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: Refine, superpowers)" >&2
        exit 0
        ;;
    esac
    # Vision/Deliver: block docs/superpowers writes
    ;;
  .superspec/*|*/.superspec/*)
    # Superspec config
    echo "[SUPERSPEC-HOOK] allowed: $RELPATH (whitelist: superspec config)" >&2
    exit 0
    ;;
  .claude/*)
    # Claude settings/rules
    echo "[SUPERSPEC-HOOK] allowed: $RELPATH (whitelist: claude config)" >&2
    exit 0
    ;;
  CLAUDE.md|CHANGELOG.md|README.md|*.md)
    # Root-level markdown files
    case "$RELPATH" in
      */*) ;; # subdirectory .md — NOT whitelisted, fall through
      *)
        echo "[SUPERSPEC-HOOK] allowed: $RELPATH (whitelist: root markdown)" >&2
        exit 0
        ;;
    esac
    ;;
  state.yaml|superspec.yaml|.superspec.yml|superspec.yml)
    # Project-level superspec config
    echo "[SUPERSPEC-HOOK] allowed: $RELPATH (whitelist: superspec config)" >&2
    exit 0
    ;;
esac

# ── Phase-based enforcement ──────────────────────────────────────

case "$PHASE" in
  Forge|Refine)
    # Code writes allowed in Forge and Refine
    echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: $PHASE)" >&2
    exit 0
    ;;
  Vision|Blueprint|Deliver)
    echo "" >&2
    echo "╔══════════════════════════════════════════╗" >&2
    echo "║     SUPERSPEC PHASE GUARD — WRITE BLOCKED    ║" >&2
    echo "╚══════════════════════════════════════════╝" >&2
    echo "" >&2
    echo "  当前阶段: $PHASE" >&2
    echo "  目标文件: $RELPATH" >&2
    echo "" >&2
    case "$PHASE" in
      Vision)
        echo "  ❌ Vision 阶段不允许写源代码" >&2
        echo "  ✅ 允许: 创建 proposal/Blueprint/tasks, 运行 guard" >&2
        echo "  💡 完成需求澄清和 artifact 创建后运行 guard --apply" >&2
        ;;
      Blueprint)
        echo "  ❌ Blueprint 阶段不允许写源代码" >&2
        echo "  ✅ 允许: brainstorming, 创建 Design Doc, 运行 guard" >&2
        echo "  💡 完成 Design Doc 后运行 superspec-guard Blueprint --apply 进入 Forge" >&2
        ;;
      Deliver)
        echo "  ❌ Deliver 阶段不允许写源代码" >&2
        echo "  ✅ 允许: 确认归档, 运行归档脚本" >&2
        ;;
    esac
    echo "" >&2
    exit 2
    ;;
esac

echo "[SUPERSPEC-HOOK] allowed: $RELPATH (phase: $PHASE)" >&2
exit 0
