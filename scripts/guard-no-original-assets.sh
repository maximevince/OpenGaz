#!/usr/bin/env bash
# CI/pre-commit guard: fail if any original LavaMind asset path is tracked by git.
set -euo pipefail
cd "$(dirname "$0")/.."
bad="$(git ls-files | grep -Ei '^(public/original|assets-original)/|\.(bmp|flc|iso)$' || true)"
if [[ -n "$bad" ]]; then
  echo "ERROR: original/forbidden asset files are tracked by git:"
  echo "$bad"
  exit 1
fi
echo "OK: no original assets tracked."
