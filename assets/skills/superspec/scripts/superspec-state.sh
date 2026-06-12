#!/bin/bash
# Superspec State — wrapper around 'superspec state' CLI command
# Usage: superspec-state.sh <subcommand> <change-name> [args...]

set -euo pipefail

SUBCOMMAND="${1:-}"
CHANGE_NAME="${2:-}"
shift 2 || true

# Call the node-based CLI
# We assume 'superspec' is in the PATH or we can find it relative to the script
superspec state "$SUBCOMMAND" "$CHANGE_NAME" "$@"
