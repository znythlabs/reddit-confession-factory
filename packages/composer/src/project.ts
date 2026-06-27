import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RenderPackage, StoryPackage } from "@rcf/core";
import { paths } from "@rcf/core";
import { renderHookCardHtml } from "./hook-card.js";
import { backgroundPathFor } from "./background.js";

export const scaffoldProject = async (rp: RenderPackage, story: StoryPackage): Promise<string> => {
  const projectDir = path.resolve(process.cwd(), `var/composer/${rp.story_id}_${rp.render_targets[0]!.platform}`);
  await mkdir(projectDir, { recursive: true });
  await mkdir(path.join(projectDir, "assets"), { recursive: true });
  await writeFile(path.join(projectDir, "hook-card.html"), renderHookCardHtml(story), "utf8");
  await writeFile(
    path.join(projectDir, "render.json"),
    JSON.stringify(
      {
        ...rp,
        background_assets: [backgroundPathFor(story.background_mood, story.story_id)],
      },
      null,
      2
    )
  );
  return projectDir;
};
