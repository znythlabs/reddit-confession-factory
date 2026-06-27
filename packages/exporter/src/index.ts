import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type RenderPackage, type StoryPackage } from "@rcf/core";
import { writeBundle } from "./bundle.js";
import { writeStoryManifest } from "./manifest.js";

const PLATFORM_BY_TARGET: Record<string, "tiktok" | "instagram_reels" | "youtube_shorts"> = {
  tiktok_reels: "tiktok",
  youtube_shorts: "youtube_shorts",
};

const main = async () => {
  const files = (await readdir(paths.renderDir())).filter((f) => f.endsWith(".json"));
  const seen = new Set<string>();
  for (const f of files) {
    const rp = JSON.parse(await readFile(path.join(paths.renderDir(), f), "utf8")) as RenderPackage;
    const story = JSON.parse(await readFile(paths.storyJson(rp.story_id), "utf8")) as StoryPackage;
    const platform = PLATFORM_BY_TARGET[rp.render_targets[0]!.platform]!;
    await writeBundle(rp, story, platform);
    seen.add(story.story_id);
  }
  for (const id of seen) await writeStoryManifest(id);
  console.log(`exporter: ${seen.size} stories bundled`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
