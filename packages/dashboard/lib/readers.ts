import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { paths, type StoryPackage, type ScoreReport, type PublishBundle, type RenderPackage } from "@rcf/core";
// ponytail: the dashboard process starts in packages/dashboard, so paths.root's
// fallback (process.cwd()/var) resolves to packages/dashboard/var — which is empty.
// Force the workspace var/ so the dashboard sees what the batch wrote.
if (!process.env.RCF_VAR_DIR) {
  process.env.RCF_VAR_DIR = path.resolve(process.cwd(), "../..", "var");
}

export type HealthCounts = {
  generated: number;
  scores: number;
  accepted: number;
  rejected: number;
  renderPackages: number;
  mp4Renders: number;
  bundles: number;
  missingMp4s: number;
};

const exists = async (p: string): Promise<boolean> => {
  try { await stat(p); return true; } catch { return false; }
};

export const readRenderPackages = async (): Promise<RenderPackage[]> => {
  const files = (await readdir(paths.renderDir()).catch(() => [])).filter((f) => f.endsWith(".json"));
  const out: RenderPackage[] = [];
  for (const f of files) {
    try {
      const raw = await readFile(path.join(paths.renderDir(), f), "utf8");
      out.push(JSON.parse(raw) as RenderPackage);
    } catch { /* skip malformed */ }
  }
  return out;
};

export const countActualMp4Renders = async (): Promise<number> => {
  const packages = await readRenderPackages();
  let n = 0;
  for (const rp of packages) {
    const allExist = await Promise.all(rp.render_targets.map((t) => exists(t.out_path)));
    if (allExist.every(Boolean)) n++;
  }
  return n;
};

export const countMissingMp4s = async (): Promise<number> => {
  const packages = await readRenderPackages();
  let n = 0;
  for (const rp of packages) {
    const allExist = await Promise.all(rp.render_targets.map((t) => exists(t.out_path)));
    if (!allExist.every(Boolean)) n++;
  }
  return n;
};

export const readHealth = async (): Promise<HealthCounts> => {
  const stories = (await readdir(paths.storiesDir()).catch(() => [])).filter((f) => f.endsWith(".json")).length;
  const scoreFiles = (await readdir(paths.scoresDir()).catch(() => [])).filter((f) => f.endsWith(".json"));
  const scoreReports = await Promise.all(
    scoreFiles.map(async (f) => JSON.parse(await readFile(path.join(paths.scoresDir(), f), "utf8")) as ScoreReport)
  );
  const accepted = scoreReports.filter((r) => r.accept_decision === "accept").length;
  const rejected = scoreReports.filter((r) => r.accept_decision === "reject").length;

  const renderPackages = await readRenderPackages();
  let mp4Renders = 0;
  let missingMp4s = 0;
  for (const rp of renderPackages) {
    const allExist = await Promise.all(rp.render_targets.map((t) => exists(t.out_path)));
    if (allExist.every(Boolean)) mp4Renders++;
    else missingMp4s++;
  }

  const bundles = (await readdir(paths.bundlesDir()).catch(() => [])).filter((f) => f.endsWith(".json")).length;

  return {
    generated: stories,
    scores: scoreFiles.length,
    accepted,
    rejected,
    renderPackages: renderPackages.length,
    mp4Renders,
    bundles,
    missingMp4s,
  };
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

// Per-story export status for the Stories page. One pass over all render
// packages and bundle directories; O(stories_with_artifacts) I/O.
export const readExportStatuses = async (): Promise<
  Map<string, { renderPackage: boolean; mp4: boolean; bundle: boolean }>
> => {
  const renderPackages = await readRenderPackages();
  const bundleDirs = (await readdir(paths.bundlesDir(), { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory());
  const map = new Map<string, { renderPackage: boolean; mp4: boolean; bundle: boolean }>();

  for (const rp of renderPackages) {
    const allExist = await Promise.all(rp.render_targets.map((t) => exists(t.out_path)));
    const mp4 = allExist.every(Boolean);
    const entry = map.get(rp.story_id) ?? { renderPackage: false, mp4: false, bundle: false };
    entry.renderPackage = true;
    if (mp4) entry.mp4 = true;
    map.set(rp.story_id, entry);
  }
  for (const d of bundleDirs) {
    const entry = map.get(d.name) ?? { renderPackage: false, mp4: false, bundle: false };
    entry.bundle = true;
    map.set(d.name, entry);
  }
  return map;
};
