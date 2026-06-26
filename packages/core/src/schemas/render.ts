import { z } from "zod";

export const ScenePlanSchema = z.object({
  scenes: z.array(
    z.object({
      scene_id: z.string(),
      kind: z.enum(["hook-card", "story-block", "twist", "outro"]),
      start_s: z.number().nonnegative(),
      duration_s: z.number().positive(),
      text: z.string().optional(),
      background_mood: z.string().optional(),
    })
  ),
});

export const RenderPackageSchema = z.object({
  story_id: z.string(),
  scene_plan: ScenePlanSchema,
  timing_map: z.record(z.string(), z.number().nonnegative()),
  background_assets: z.array(z.string()),
  audio_assets: z.array(z.string()),
  render_targets: z.array(
    z.object({
      platform: z.enum(["tiktok_reels", "youtube_shorts"]),
      out_path: z.string(),
    })
  ),
});
export type ScenePlan = z.infer<typeof ScenePlanSchema>;
export type RenderPackage = z.infer<typeof RenderPackageSchema>;
