#!/usr/bin/env node
// Start the dashboard and orchestrator together. Logs to var/logs/.
// No bash dependency — runs under the host's Node + pnpm so Windows
// pnpm + Windows esbuild (or Linux pnpm + Linux esbuild) stay aligned.
// Ctrl+C cleans up both children.

import { spawn } from "node:child_process";
import { mkdirSync, openSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const VAR = process.env.RCF_VAR_DIR || path.join(ROOT, "var");
const LOGS = path.join(VAR, "logs");
mkdirSync(LOGS, { recursive: true });

const startChild = (pkg, script, logFile) => {
  const fd = openSync(logFile, "a");
  return spawn(PNPM, ["--filter", pkg, "run", script], {
    cwd: ROOT,
    stdio: ["ignore", fd, fd],
    shell: true,
  });
};

const dashboardLog = path.join(LOGS, "dashboard.log");
const orchestratorLog = path.join(LOGS, "orchestrator.log");
const dashboard = startChild("@rcf/dashboard", "dev", dashboardLog);
const orchestrator = startChild("@rcf/orchestrator", "start", orchestratorLog);

console.log(`dashboard    -> http://localhost:3001  (pid ${dashboard.pid}, log: ${dashboardLog})`);
console.log(`orchestrator -> daily 09:00             (pid ${orchestrator.pid}, log: ${orchestratorLog})`);
console.log("dev: running. Ctrl+C to stop.");

const cleanup = () => {
  for (const c of [dashboard, orchestrator]) {
    try { c.kill(); } catch { /* already gone */ }
  }
};

// ponytail: when the dashboard fails to start (EADDRINUSE because of a leftover
// orphan, or Next.js fails to compile on first load), pnpm sometimes returns
// exit code 0 even though the process is dead. Wait 5s before treating any
// dashboard exit as intentional, so a startup failure doesn't cascade-kill
// the orchestrator with a misleading "exited with code 0" message.
const STABILITY_MS = 5000;
let dashboardStable = false;
dashboard.on("exit", (code) => {
  if (!dashboardStable) {
    console.error(`dev: dashboard died during startup (code ${code}). Check ${dashboardLog} and restart pnpm dev.`);
    cleanup();
    process.exit(1);
  }
  console.log(`dev: dashboard exited with code ${code}, cleaning up`);
  cleanup();
  process.exit(code ?? 0);
});
setTimeout(() => { dashboardStable = true; }, STABILITY_MS);

orchestrator.on("exit", (code) => {
  console.log(`dev: orchestrator exited with code ${code}, cleaning up`);
  cleanup();
  process.exit(code ?? 0);
});

process.on("SIGINT", () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });
