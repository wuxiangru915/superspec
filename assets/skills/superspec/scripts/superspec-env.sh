#!/bin/bash
# Superspec script locator — source this file to export paths to bundled scripts.
#
# Usage:
#   . /path/to/superspec/scripts/superspec-env.sh
#
# This file is sourced by workflow snippets. Do not set global shell options here.

_superspec_env_source="${BASH_SOURCE[0]:-$0}"
_superspec_script_dir="$(cd "$(dirname "$_superspec_env_source")" && pwd -P)"
_superspec_env_sourced=0
(return 0 2>/dev/null) && _superspec_env_sourced=1

export SUPERSPEC_GUARD="${SUPERSPEC_GUARD:-${_superspec_script_dir}/superspec-guard.sh}"
export SUPERSPEC_STATE="${SUPERSPEC_STATE:-${_superspec_script_dir}/superspec-state.sh}"
export SUPERSPEC_HANDOFF="${SUPERSPEC_HANDOFF:-${_superspec_script_dir}/superspec-handoff.sh}"
export SUPERSPEC_ARCHIVE="${SUPERSPEC_ARCHIVE:-${_superspec_script_dir}/superspec-Deliver.sh}"
export SUPERSPEC_YAML_VALIDATE="${SUPERSPEC_YAML_VALIDATE:-${_superspec_script_dir}/superspec-yaml-validate.sh}"

_superspec_bash_is_usable() {
  local _superspec_bash_candidate="$1"
  if [ -z "$_superspec_bash_candidate" ]; then
    return 1
  fi
  case "$_superspec_bash_candidate" in
    */Windows/System32/bash.exe|*/windows/system32/bash.exe|*\\Windows\\System32\\bash.exe|*\\windows\\system32\\bash.exe)
      return 1
      ;;
  esac
  "$_superspec_bash_candidate" -lc 'printf superspec-bash-ok' >/dev/null 2>&1
}

_superspec_resolve_bash() {
  local _superspec_bash_candidate

  if _superspec_bash_is_usable "${SUPERSPEC_BASH:-}"; then
    printf '%s\n' "$SUPERSPEC_BASH"
    return 0
  fi

  if _superspec_bash_is_usable "${BASH:-}"; then
    printf '%s\n' "$BASH"
    return 0
  fi

  _superspec_bash_candidate="$(command -v sh 2>/dev/null | awk '{ sub(/\/sh(\.exe)?$/, "/bash.exe"); print }')"
  if _superspec_bash_is_usable "$_superspec_bash_candidate"; then
    printf '%s\n' "$_superspec_bash_candidate"
    return 0
  fi

  _superspec_bash_candidate="$(command -v bash 2>/dev/null || true)"
  if _superspec_bash_is_usable "$_superspec_bash_candidate"; then
    printf '%s\n' "$_superspec_bash_candidate"
    return 0
  fi

  return 1
}

SUPERSPEC_BASH="$(_superspec_resolve_bash || true)"
export SUPERSPEC_BASH

_superspec_env_fail() {
  echo "ERROR: Superspec scripts not found. Ensure the superspec skill is installed completely." >&2
  echo "Expected path pattern: */superspec/scripts/superspec-*.sh under project or platform skill directories" >&2
}

_superspec_bash_fail() {
  echo "ERROR: usable bash not found. Install Git Bash or set SUPERSPEC_BASH to a working bash executable." >&2
  echo "Windows WSL launcher bash.exe is not supported for Superspec scripts." >&2
}

_superspec_env_abort() {
  local _superspec_env_was_sourced="$_superspec_env_sourced"
  unset _superspec_env_source _superspec_script_dir _superspec_script _superspec_env_missing _superspec_env_sourced
  unset _superspec_bash_candidate
  unset -f _superspec_env_fail _superspec_bash_fail _superspec_bash_is_usable _superspec_resolve_bash
  if [ "$_superspec_env_was_sourced" -eq 1 ]; then
    unset -f _superspec_env_abort
    return 1
  fi
  exit 1
}

_superspec_env_missing=0
if [ -z "$SUPERSPEC_BASH" ]; then
  _superspec_bash_fail
  _superspec_env_missing=1
fi
for _superspec_script in \
  "$SUPERSPEC_GUARD" \
  "$SUPERSPEC_STATE" \
  "$SUPERSPEC_HANDOFF" \
  "$SUPERSPEC_ARCHIVE" \
  "$SUPERSPEC_YAML_VALIDATE"; do
  if [ ! -f "$_superspec_script" ]; then
    _superspec_env_fail
    _superspec_env_missing=1
    break
  fi
done

if [ "$_superspec_env_missing" -ne 0 ]; then
  _superspec_env_abort
else
  unset _superspec_env_source _superspec_script_dir _superspec_script _superspec_env_missing _superspec_env_sourced
  unset _superspec_bash_candidate
  unset -f _superspec_env_fail _superspec_bash_fail _superspec_bash_is_usable _superspec_resolve_bash _superspec_env_abort
fi
