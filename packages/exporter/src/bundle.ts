import { mkdir, writeFile, stat, copyFile } from "node:fs/promises";
import path from "node:path";
import { PublishBundleSchema, type StoryPackage, type RenderPackage, type PublishBundle, paths } from "@rcf/core";
import { buildCaption, buildHashtags, buildTitles } from "./captions.js";

export const writeBundle = async (
  rp: RenderPackage,
  story: StoryPackage,
  platform: "tiktok" | "instagram_reels" | "youtube_shorts"
): Promise<PublishBundle> => {
  const src = rp.render_targets[0]!.out_path;
  await stat(src); // hard fail if render missing
  const dir = path.join(paths.bundleDir(story.story_id), platform);
  await mkdir(dir, { recursive: true });
  const dst = path.join(dir, path.basename(src));
  await copyFile(src, dst);
  const bundle = PublishBundleSchema.parse({
    story_id: story.story_id,
    platform,
    video_path: dst,
    caption: buildCaption(story),
    title_options: buildTitles(story),
    hashtags: buildHashtags(story),
    status: "ready",
  });
  await writeFile(path.join(dir, "bundle.json"), JSON.stringify(bundle, null, 2));
  return bundle;
};
