import { z } from "zod";

export const PublishBundleSchema = z.object({
  story_id: z.string(),
  platform: z.enum(["tiktok", "instagram_reels", "youtube_shorts"]),
  video_path: z.string(),
  caption: z.string().min(10).max(2200),
  title_options: z.array(z.string().min(3).max(140)).min(1).max(5),
  hashtags: z.array(z.string().regex(/^#?[A-Za-z0-9_]+$/)).min(2).max(15),
  scheduled_at: z.string().datetime().optional(),
  status: z.enum(["draft", "ready", "posted", "failed"]),
});
