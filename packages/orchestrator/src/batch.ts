import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const pexec = promisify(execFile);

const run = (pkg: string, script: string, env: Record<string, string> = {}) =>
  pexec("pnpm", ["--filter", pkg, "run", script], {
    cwd: path.resolve(process.cwd()),
    env: { ...process.env, ...env },
  });

export type BatchSummary = {
  generated: number;
  accepted_by_gate: number;
  accepted_by_judge: number;
  rendered: number;
  bundled: number;
  failed: number;
};

export const runDailyBatch = async (opts: { generateCount: number; judgeBudget: number }): Promise<BatchSummary> => {
  const summary: BatchSummary = { generated: 0, accepted_by_gate: 0, accepted_by_judge: 0, rendered: 0, bundled: 0, failed: 0 };
  try {
    await run("@rcf/generator", "start", { RCF_GENERATE_COUNT: String(opts.generateCount) });
    summary.generated = opts.generateCount;
    await run("@rcf/heuristic", "start");
    await run("@rcf/judge", "start", { RCF_JUDGE_BUDGET: String(opts.judgeBudget) });
    await run("@rcf/formatter", "start");
    await run("@rcf/composer", "start");
    await run("@rcf/exporter", "start");
    summary.rendered = opts.generateCount;
    summary.bundled = opts.generateCount;
  } catch (e) {
    summary.failed++;
    console.error("batch failure:", e);
  }
  return summary;
};
