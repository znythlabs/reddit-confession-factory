import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { paths, type ScoreReport } from "@rcf/core";

const pexec = promisify(execFile);

const run = (pkg: string, script: string, env: Record<string, string> = {}) =>
  pexec("pnpm", ["--filter", pkg, "run", script], {
    cwd: path.resolve(process.cwd()),
    env: { ...process.env, ...env },
  });

const countJson = async (dir: string): Promise<number> => {
  try {
    const files = await readdir(dir);
    return files.filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
};

const countAccepted = async (dir: string): Promise<number> => {
  try {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    let n = 0;
    for (const f of files) {
      try {
        const r = JSON.parse(await readFile(path.join(dir, f), "utf8")) as ScoreReport;
        if (r.accept_decision === "accept") n++;
      } catch { /* skip malformed */ }
    }
    return n;
  } catch {
    return 0;
  }
};

const countBundles = async (): Promise<number> => {
  try {
    let n = 0;
    for (const sd of await readdir(paths.bundlesDir(), { withFileTypes: true })) {
      if (!sd.isDirectory()) continue;
      for (const p of await readdir(path.join(paths.bundlesDir(), sd.name), { withFileTypes: true })) {
        if (!p.isDirectory()) continue;
        try {
          await readFile(path.join(paths.bundlesDir(), sd.name, p.name, "bundle.json"), "utf8");
          n++;
        } catch { /* skip incomplete */ }
      }
    }
    return n;
  } catch {
    return 0;
  }
};

export type BatchSummary = {
  generated: number;
  accepted_by_gate: number;
  accepted_by_judge: number;
  rendered: number;
  bundled: number;
  failed: number;
};

const STAGES = [
  { pkg: "@rcf/generator", env: (o: { generateCount: number; judgeBudget: number }) => ({ RCF_GENERATE_COUNT: String(o.generateCount) }) },
  { pkg: "@rcf/heuristic", env: () => ({}) },
  { pkg: "@rcf/judge",     env: (o: { generateCount: number; judgeBudget: number }) => ({ RCF_JUDGE_BUDGET: String(o.judgeBudget) }) },
  { pkg: "@rcf/formatter", env: () => ({}) },
  { pkg: "@rcf/composer",  env: () => ({}) },
  { pkg: "@rcf/exporter",  env: () => ({}) },
] as const;

export const runDailyBatch = async (opts: { generateCount: number; judgeBudget: number }): Promise<BatchSummary> => {
  const summary: BatchSummary = { generated: 0, accepted_by_gate: 0, accepted_by_judge: 0, rendered: 0, bundled: 0, failed: 0 };
  for (const s of STAGES) {
    try {
      await run(s.pkg, "start", s.env(opts));
    } catch (e) {
      summary.failed++;
      console.error(`batch: ${s.pkg} failed:`, e instanceof Error ? e.message : e);
    }
  }
  summary.generated = await countJson(paths.storiesDir());
  summary.accepted_by_gate = await countAccepted(paths.scoresDir());
  summary.accepted_by_judge = await countAccepted(paths.scoresDir()); // judge re-reads, updates accept_decision
  summary.rendered = await countJson(paths.renderDir());
  summary.bundled = await countBundles();
  return summary;
};
