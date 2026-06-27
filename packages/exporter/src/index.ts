import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type RenderPackage, type StoryPackage } from "@rcf/core";
import { writeBundle } from "./bundle.js";
import { writeStoryManifest } from "./manifest.js";

const PLATFORM_BY_TARGET: Record<string, Array<"tiktok" | "instagram_reels" | "youtube_shorts">> = {
  tiktok_reels: ["tiktok", "instagram_reels"],
  youtube_shorts: ["youtube_shorts"],
};

const main = async () => {
  const files = (await readdir(paths.renderDir()).catch(() => [] as string[])).filter((f) => f.endsWith(".json"));
  const seen = new Set<string>();
  for (const f of files) {
    const rp = JSON.parse(await readFile(path.join(paths.renderDir(), f), "utf8")) as RenderPackage;
    const story = JSON.parse(await readFile(paths.storyJson(rp.story_id), "utf8")) as StoryPackage;
    const platforms = PLATFORM_BY_TARGET[rp.render_targets[0]!.platform] ?? [];
    for (const platform of platforms) {
      await writeBundle(rp, story, platform);
    }
    seen.add(story.story_id);
  }
  for (const id of seen) await writeStoryManifest(id);
  console.log(`exporter: ${seen.size} stories bundled`);
};

main().catch((e) => {
  const msg = e instanceof Error ? e.message : String(e);
  console.error(`exporter: error: ${msg.slice(0, 200)}`);
  process.exit(1);
});
