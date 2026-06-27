import {
  RenderPackageSchema,
  type StoryPackage,
  type ScoreReport,
  type RenderPackage,
  type ScenePlan,
  paths,
} from "@rcf/core";
import { writeFile, mkdir } from "node:fs/promises";
import { segmentBlocks } from "./segment.js";
import { pacingFactor, adjustDuration } from "./pacing.js";
import { ctaText } from "./cta.js";

export const formatStoryPackage = async (
  story: StoryPackage,
  _score: ScoreReport,
  opts: { platform: "tiktok_reels" | "youtube_shorts"; outDir?: string }
): Promise<RenderPackage> => {
  const storyPacing =
    opts.platform === "tiktok_reels"
      ? story.platform_variants.tiktok_reels.pacing
      : story.platform_variants.youtube_shorts.pacing;
  const factor = pacingFactor(opts.platform, storyPacing);
  const blocks = segmentBlocks(story);

  const hookDuration = 2.0;
  const outroDuration = 1.5;
  let cursor = 0;
  const scenes: ScenePlan["scenes"] = [
    {
      scene_id: `${story.story_id}_hook`,
      kind: "hook-card" as const,
      start_s: cursor,
      duration_s: hookDuration,
      text: story.hook,
      background_mood: story.background_mood,
    },
  ];
  cursor += hookDuration;
  for (const b of blocks) {
    const d = adjustDuration(b.duration_s, factor);
    scenes.push({
      scene_id: `${story.story_id}_b${b.index}`,
      kind: "story-block" as const,
      start_s: cursor,
      duration_s: d,
      text: b.text,
      background_mood: story.background_mood,
    });
    cursor += d;
  }
  scenes.push({
    scene_id: `${story.story_id}_twist`,
    kind: "twist" as const,
    start_s: cursor,
    duration_s: adjustDuration(3, factor),
    text: story.twist,
    background_mood: story.background_mood,
  });
  cursor += adjustDuration(3, factor);
  scenes.push({
    scene_id: `${story.story_id}_outro`,
    kind: "outro" as const,
    start_s: cursor,
    duration_s: outroDuration,
    text: ctaText(story.cta),
  });

  const finalRuntime = cursor + outroDuration;
  if (finalRuntime > 60) {
    throw new Error(`render runtime exceeds 60s: ${finalRuntime.toFixed(1)}s`);
  }

  const out = (opts.outDir ?? paths.renderDir()) + `/${story.story_id}_${opts.platform}.mp4`;
  const pkg = RenderPackageSchema.parse({
    story_id: story.story_id,
    scene_plan: { scenes },
    timing_map: Object.fromEntries(scenes.map((s) => [s.scene_id, s.start_s])),
    background_assets: [],
    audio_assets: [],
    render_targets: [{ platform: opts.platform, out_path: out }],
  });
  await mkdir(paths.renderDir(), { recursive: true });
  await writeFile(paths.renderJson(`${story.story_id}_${opts.platform}`), JSON.stringify(pkg, null, 2));
  return pkg;
};
