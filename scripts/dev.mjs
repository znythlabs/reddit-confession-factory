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
process.on("SIGINT", () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });

const exit = await Promise.race([
  new Promise((res) => dashboard.on("exit", (code) => res({ who: "dashboard", code }))),
  new Promise((res) => orchestrator.on("exit", (code) => res({ who: "orchestrator", code }))),
]);
console.log(`dev: ${exit.who} exited with code ${exit.code}, cleaning up`);
cleanup();
process.exit(exit.code ?? 1);
