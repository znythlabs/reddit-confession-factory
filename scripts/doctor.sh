#!/usr/bin/env bash
set -euo pipefail
command -v node  >/dev/null || { echo "missing: node"; exit 1; }
command -v pnpm  >/dev/null || { echo "missing: pnpm"; exit 1; }
command -v npx   >/dev/null || { echo "missing: npx"; exit 1; }
node -v | grep -qE '^v(20|22|24)\.' || { echo "node must be 20.x, 22.x, or 24.x"; exit 1; }
echo "doctor: ok"
