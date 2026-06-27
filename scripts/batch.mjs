#!/usr/bin/env node
// Run one daily batch now (no cron). Exits with the BatchSummary on stdout.
// Node-only — no bash, no WSL-vs-Windows esbuild mismatch.

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const env = {
  ...process.env,
  RCF_VAR_DIR: process.env.RCF_VAR_DIR || path.join(ROOT, "var"),
  RCF_GENERATE_COUNT: process.env.RCF_GENERATE_COUNT || "5",
  RCF_JUDGE_BUDGET: process.env.RCF_JUDGE_BUDGET || "4",
};

const r = spawnSync(
  PNPM,
  ["--filter", "@rcf/orchestrator", "run", "batch"],
  { cwd: ROOT, env, encoding: "utf8", shell: true }
);

process.stdout.write(r.stdout ?? "");
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status ?? 1);
