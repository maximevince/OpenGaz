#!/usr/bin/env bash
# CI guard: the dev inspector must not survive into a production build.
#
# src/ui/debug is reached only through `if (import.meta.env.DEV) import(...)` in src/main.ts.
# Vite turns that flag into a literal `false`, so Rollup drops the branch and the chunk. If a
# future change imports the panel statically — or from a module that is not dev-gated — the
# marker below turns up in dist/ and this fails, before the cheat buttons reach a player.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -d dist ]]; then
  echo "ERROR: dist/ not found — run 'pnpm build' first." >&2
  exit 1
fi

bad="$(grep -rl 'OPENGAZ_DEBUG_PANEL' dist || true)"
if [[ -n "$bad" ]]; then
  echo "ERROR: the dev inspector was bundled into the production build:"
  echo "$bad"
  exit 1
fi
echo "OK: no dev inspector in dist/."
