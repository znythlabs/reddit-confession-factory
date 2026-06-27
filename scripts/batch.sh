#!/usr/bin/env bash
# Run one daily batch now (no cron). Exits with the BatchSummary on stdout.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export RCF_VAR_DIR="${RCF_VAR_DIR:-$ROOT/var}"
export RCF_GENERATE_COUNT="${RCF_GENERATE_COUNT:-5}"
export RCF_JUDGE_BUDGET="${RCF_JUDGE_BUDGET:-4}"

pnpm -C "$ROOT" --filter @rcf/orchestrator run batch
