import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

export const POST = async () => {
  const workspaceRoot = path.resolve(process.cwd(), "../..");
  const varDir = path.join(workspaceRoot, "var");
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

  const stdout = await new Promise<string>((resolve, reject) => {
    let buf = "";
    let errBuf = "";
    child.stdout.on("data", (b) => { buf += b.toString(); });
    child.stderr.on("data", (b) => { errBuf += b.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(buf);
      else reject(new Error(`batch exited with code ${code}: ${errBuf.slice(-400)}`));
    });
  });

  try {
    const summary = JSON.parse(stdout.trim().split("\n").pop() ?? "{}");
    return NextResponse.json({ ok: true, summary });
  } catch {
    return NextResponse.json({ ok: true, raw: stdout }, { status: 200 });
  }
};
