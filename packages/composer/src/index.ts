import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type RenderPackage, type StoryPackage } from "@rcf/core";
import { renderRenderPackage } from "./render.js";

const main = async () => {
  const files = (await readdir(paths.renderDir())).filter((f) => f.endsWith(".json"));
  let ok = 0;
  let failed = 0;
  for (const f of files) {
    const rp = JSON.parse(await readFile(path.join(paths.renderDir(), f), "utf8")) as RenderPackage;
    const story = JSON.parse(await readFile(paths.storyJson(rp.story_id), "utf8")) as StoryPackage;
    try {
      await renderRenderPackage(rp, story);
      ok++;
    } catch (e) {
      console.error(`render failed for ${rp.story_id}:`, e);
      failed++;
    }
  }
  console.log(`composer: ${ok} ok, ${failed} failed`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
