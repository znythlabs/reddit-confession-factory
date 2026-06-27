#!/usr/bin/env node
// Start the dashboard and orchestrator together. Logs to var/logs/.
// No bash dependency — runs under the host's Node + pnpm so Windows
// pnpm + Windows esbuild (or Linux pnpm + Linux esbuild) stay aligned.
// Ctrl+C cleans up both children.

import { spawn, execSync } from "node:child_process";
import { mkdirSync, openSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const VAR = process.env.RCF_VAR_DIR || path.join(ROOT, "var");
const LOGS = path.join(VAR, "logs");
const DASHBOARD_PORT = 3001;
mkdirSync(LOGS, { recursive: true });

// ponytail: kill any orphan process still holding the dashboard port from a
// previous `pnpm dev` that didn't clean up (Ctrl+C during boot, terminal
// closed, process orphaned by Windows job-object edge cases). Without this,
// Next.js starts, tries to bind, fails with EADDRINUSE, the pnpm child exits
// with code 0, and dev.mjs cascade-kills the orchestrator with a misleading
// "died during startup (code 0)" message. Run the kill + 1s settle *before*
// wiping .next/ so the orphan can't race the new dev server.
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

const killPort = (port) => {
  try {
    if (process.platform === "win32") {
      const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
      const pids = new Set();
      for (const line of out.split("\n")) {
        if (!line.includes("LISTENING")) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        try { execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" }); } catch { /* already gone */ }
      }
      if (pids.size > 0) {
        console.log(`dev: killed ${pids.size} orphan(s) on port ${port}`);
        sleepSync(1000);
      }
    } else {
      const out = execSync(`lsof -ti:${port} 2>/dev/null || true`, { encoding: "utf8" });
      const pids = out.split("\n").map((s) => s.trim()).filter(Boolean);
      for (const pid of pids) {
        try { execSync(`kill -9 ${pid}`, { stdio: "ignore" }); } catch { /* already gone */ }
      }
      if (pids.length > 0) {
        console.log(`dev: killed ${pids.length} orphan(s) on port ${port}`);
        sleepSync(1000);
      }
    }
  } catch { /* no process on port */ }
};

killPort(DASHBOARD_PORT);

// ponytail: Next.js dev keeps the chunk graph in memory but chunk IDs are
// baked into the compiled .next/ on disk. After a `pnpm --filter
// @rcf/dashboard build` renumbers chunks, the running dev server references
// the old IDs and crashes with `Error: Cannot find module './43.js'` on the
// next request. Wipe `.next/` before each `pnpm dev` so the in-memory and
// on-disk states always start aligned.
rmSync(path.join(ROOT, "packages", "dashboard", ".next"), { recursive: true, force: true });

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

console.log(`dashboard    -> http://localhost:${DASHBOARD_PORT}  (pid ${dashboard.pid}, log: ${dashboardLog})`);
console.log(`orchestrator -> daily 09:00                          (pid ${orchestrator.pid}, log: ${orchestratorLog})`);
console.log("dev: running. Ctrl+C to stop.");

const cleanup = () => {
  for (const c of [dashboard, orchestrator]) {
    try { c.kill(); } catch { /* already gone */ }
  }
};

// ponytail: when the dashboard fails to start (EADDRINUSE because of a leftover
// orphan, or Next.js fails to compile on first load), pnpm sometimes returns
// exit code 0 even though the process is dead. Wait 8s before treating any
// dashboard exit as intentional, so a startup failure doesn't cascade-kill
// the orchestrator with a misleading "exited with code 0" message. 8s covers
// Next.js's first cold compile of the app router pages.
const STABILITY_MS = 8000;
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
