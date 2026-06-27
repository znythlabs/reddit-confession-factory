import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { readFile, readdir, rm } from "node:fs/promises";
import { paths, type ScoreReport } from "@rcf/core";

const pexec = promisify(execFile);

// ponytail: on Windows, node-spawn needs the .cmd extension to find pnpm via CreateProcess.
// bash looks it up by name in PATH, but execFile does not.
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const run = (pkg: string, script: string, env: Record<string, string> = {}) =>
  pexec(PNPM, ["--filter", pkg, "run", script], {
    cwd: path.resolve(process.cwd()),
    env: { ...process.env, ...env },
    shell: true,
  });

// ponytail: Node's promisify(execFile) attaches .stderr to the rejection. We type it
// as a named const so the cast is documented at the call site, not inlined.
type ExecError = Error & { stderr?: string | Buffer; stdout?: string | Buffer };

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

const clearArtifacts = async (): Promise<void> => {
  // Each batch starts from an empty artifacts tree so BatchSummary counts reflect
  // this run only. Keep the directories themselves — the downstream CLIs assume
  // paths.storiesDir()/scoresDir()/etc. exist when they readdir; only the files
  // are wiped. SQLite (var/analytics.sqlite) is intentionally preserved.
  for (const dir of [paths.storiesDir(), paths.scoresDir(), paths.renderDir(), paths.bundlesDir()]) {
    try {
      const files = await readdir(dir);
      await Promise.all(files.map((f) => rm(path.join(dir, f), { recursive: true, force: true })));
    } catch { /* dir might not exist yet */ }
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

type BatchOpts = { generateCount: number; judgeBudget: number };

const STAGES = [
  { pkg: "@rcf/generator", script: "start", env: (o: BatchOpts) => ({ RCF_GENERATE_COUNT: String(o.generateCount) }) },
  { pkg: "@rcf/heuristic", script: "start", env: () => ({}) },
  { pkg: "@rcf/judge",     script: "start", env: (o: BatchOpts) => ({ RCF_JUDGE_BUDGET: String(o.judgeBudget) }) },
  { pkg: "@rcf/formatter", script: "start", env: () => ({}) },
  { pkg: "@rcf/composer",  script: "start", env: () => ({}) },
  { pkg: "@rcf/exporter",  script: "start", env: () => ({}) },
  { pkg: "@rcf/analytics", script: "record", env: () => ({}) },
] as const;

export const runDailyBatch = async (opts: BatchOpts): Promise<BatchSummary> => {
  await clearArtifacts();
  const summary: BatchSummary = { generated: 0, accepted_by_gate: 0, accepted_by_judge: 0, rendered: 0, bundled: 0, failed: 0 };
  for (const s of STAGES) {
    try {
      await run(s.pkg, s.script, s.env(opts));
    } catch (raw) {
      summary.failed++;
      const e = raw as ExecError;
      const stderr = e.stderr ? e.stderr.toString().trim() : "";
      const tail = stderr ? stderr.split("\n").slice(-5).join(" | ") : "";
      console.error(`batch: ${s.pkg} ${s.script} failed: ${e.message ?? raw}`);
      if (tail) console.error(`  stderr: ${tail}`);
    }
  }
  summary.generated = await countJson(paths.storiesDir());
  summary.accepted_by_gate = await countAccepted(paths.scoresDir());
  summary.accepted_by_judge = await countAccepted(paths.scoresDir()); // judge overwrites accept_decision
  // Counts render/*.json, which formatter produces (a "render package"
  // is a JSON spec, not an MP4). Composer would produce actual MP4s
  // but requires HyperFrames, which v1 doesn't ship.
  summary.rendered = await countJson(paths.renderDir());
  summary.bundled = await countBundles();
  return summary;
};
