import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths } from "@rcf/core";
import { judgeSurvivors } from "./judge.js";

const main = async () => {
  const dir = paths.scoresDir();
  let files: string[] = [];
  try { files = (await readdir(dir)).filter((f) => f.endsWith(".json")); } catch { /* empty dir */ }
  const allPaths = files.map((f) => path.join(dir, f));
  const reports = await judgeSurvivors(allPaths, { budgetMax: Number(process.env.RCF_JUDGE_BUDGET ?? "8") });
  const accepted = reports.filter((r) => r.accept_decision === "accept").length;
  console.log(`judge: ${accepted}/${reports.length} accepted`);
};

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`judge: error: ${msg.slice(0, 200)}`);
  process.exit(1);
});
