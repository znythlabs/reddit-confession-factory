import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { paths, type StoryPackage, type ScoreReport, type PublishBundle } from "@rcf/core";
// ponytail: the dashboard process starts in packages/dashboard, so paths.root's
// fallback (process.cwd()/var) resolves to packages/dashboard/var — which is empty.
// Force the workspace var/ so the dashboard sees what the batch wrote.
if (!process.env.RCF_VAR_DIR) {
  process.env.RCF_VAR_DIR = path.resolve(process.cwd(), "../..", "var");
}
export type HealthCounts = { stories: number; scores: number; render: number; bundles: number; failed: number };

export const readHealth = async (): Promise<HealthCounts> => {
  const stories = (await readdir(paths.storiesDir()).catch(() => [])).filter((f) => f.endsWith(".json")).length;
  const scores = (await readdir(paths.scoresDir()).catch(() => [])).filter((f) => f.endsWith(".json"));
  const scoreReports = await Promise.all(
    scores.map(async (f) => JSON.parse(await readFile(path.join(paths.scoresDir(), f), "utf8")) as ScoreReport)
  );
  const failed = scoreReports.filter((r) => r.accept_decision === "reject").length;
  const render = (await readdir(paths.renderDir()).catch(() => [])).filter((f) => f.endsWith(".json")).length;
  const bundles = (await readdir(paths.bundlesDir()).catch(() => [])).filter((f) => f.endsWith(".json")).length;
  return { stories, scores: scores.length, render, bundles, failed };
};

export const readAcceptedStories = async (): Promise<Array<{ story: StoryPackage; score: ScoreReport }>> => {
  const scoreFiles = (await readdir(paths.scoresDir()).catch(() => [])).filter((f) => f.endsWith(".json"));
  const out: Array<{ story: StoryPackage; score: ScoreReport }> = [];
  for (const f of scoreFiles) {
    const score = JSON.parse(await readFile(path.join(paths.scoresDir(), f), "utf8")) as ScoreReport;
    if (score.accept_decision !== "accept") continue;
    const story = JSON.parse(await readFile(paths.storyJson(score.story_id), "utf8")) as StoryPackage;
    out.push({ story, score });
  }
  return out;
};

export const readBundles = async (): Promise<PublishBundle[]> => {
  const root = paths.bundlesDir();
  const storyDirs = (await readdir(root, { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory());
  const out: PublishBundle[] = [];
  for (const sd of storyDirs) {
    const subs = (await readdir(path.join(root, sd.name), { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory());
    for (const s of subs) {
      try {
        const raw = await readFile(path.join(root, sd.name, s.name, "bundle.json"), "utf8");
        out.push(JSON.parse(raw) as PublishBundle);
      } catch { /* skip */ }
    }
  }
  return out;
};
