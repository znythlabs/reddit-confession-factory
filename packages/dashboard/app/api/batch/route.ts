import "../../../lib/env";
 import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

export const POST = async () => {
  const workspaceRoot = path.resolve(process.cwd(), "../..");
  const varDir = path.join(workspaceRoot, "var");
  const logDir = path.join(varDir, "logs");
  const logFile = path.join(logDir, "batch-trigger.log");
  await mkdir(logDir, { recursive: true });

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    RCF_VAR_DIR: varDir,
    RCF_GENERATE_COUNT: process.env.RCF_GENERATE_COUNT ?? "5",
    RCF_JUDGE_BUDGET: process.env.RCF_JUDGE_BUDGET ?? "4",
  };

  const child = spawn(
    PNPM,
    ["--filter", "@rcf/orchestrator", "run", "batch"],
    { cwd: workspaceRoot, env, shell: true }
  );

  const combined = await new Promise<string>((resolve, reject) => {
    let buf = "";
    child.stdout.on("data", (b) => { buf += b.toString(); });
    child.stderr.on("data", (b) => { buf += b.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(buf);
      else reject(new Error(`batch exited with code ${code}`));
    });
  });

  // Persist every click with a timestamp, stdout + stderr merged.
  await appendFile(
    logFile,
    `\n=== ${new Date().toISOString()} ===\n${combined}\n`,
    "utf8"
  );

  // The pnpm/tsx header lines come first; the JSON summary is the last
  // {...} block in the output. Find it instead of trusting the last line.
  const matches = combined.match(/\{[\s\S]*?\n\}/g);
  const lastJson = matches ? matches[matches.length - 1] : null;

  if (lastJson) {
    try {
      const summary = JSON.parse(lastJson);
      return NextResponse.json({ ok: true, summary, log: logFile });
    } catch {
      // fall through to raw
    }
  }
  return NextResponse.json({ ok: true, raw: combined, log: logFile }, { status: 200 });
};
