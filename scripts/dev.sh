#!/usr/bin/env bash
# Start the dashboard and orchestrator together. Logs to var/logs/.
# Ctrl+C cleans up both. Exits when either process exits.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export RCF_VAR_DIR="${RCF_VAR_DIR:-$ROOT/var}"
mkdir -p "$RCF_VAR_DIR/logs"

DASHBOARD_LOG="$RCF_VAR_DIR/logs/dashboard.log"
ORCHESTRATOR_LOG="$RCF_VAR_DIR/logs/orchestrator.log"

cleanup() {
  echo "dev: stopping children..."
  if [ -n "${DASHBOARD_PID:-}" ] && kill -0 "$DASHBOARD_PID" 2>/dev/null; then
    kill "$DASHBOARD_PID" 2>/dev/null || true
  fi
  if [ -n "${ORCHESTRATOR_PID:-}" ] && kill -0 "$ORCHESTRATOR_PID" 2>/dev/null; then
    kill "$ORCHESTRATOR_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

pnpm -C "$ROOT" --filter @rcf/dashboard dev > "$DASHBOARD_LOG" 2>&1 &
DASHBOARD_PID=$!
echo "dashboard  -> http://localhost:3001  (pid $DASHBOARD_PID, log: $DASHBOARD_LOG)"

pnpm -C "$ROOT" --filter @rcf/orchestrator start > "$ORCHESTRATOR_LOG" 2>&1 &
ORCHESTRATOR_PID=$!
echo "orchestrator scheduled daily at 09:00  (pid $ORCHESTRATOR_PID, log: $ORCHESTRATOR_LOG)"

echo "dev: running. Tail logs in another shell, or Ctrl+C to stop."

# Wait for either child to exit; propagate its exit code.
wait -n "$DASHBOARD_PID" "$ORCHESTRATOR_PID"
exit $?
