import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type StoryPackage, type ScoreReport } from "@rcf/core";
import { formatStoryPackage } from "./format.js";

const main = async () => {
  const scoreFiles = (await readdir(paths.scoresDir())).filter((f) => f.endsWith(".json"));
  const platforms: ("tiktok_reels" | "youtube_shorts")[] = ["tiktok_reels", "youtube_shorts"];
  let count = 0;
  for (const f of scoreFiles) {
    const score = JSON.parse(await readFile(path.join(paths.scoresDir(), f), "utf8")) as ScoreReport;
    if (score.accept_decision !== "accept") continue;
    const story = JSON.parse(await readFile(paths.storyJson(score.story_id), "utf8")) as StoryPackage;
    for (const p of platforms) {
      await formatStoryPackage(story, score, { platform: p });
      count++;
    }
  }
  console.log(`formatter: wrote ${count} render packages`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
