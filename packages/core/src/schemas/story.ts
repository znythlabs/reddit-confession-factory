import { z } from "zod";

export const ForumCardSchema = z.object({
  display_title: z.string().min(3).max(140),
  fictional_handle: z.string().min(2).max(40),
  fictional_community_label: z.string().min(2).max(60),
  relative_time_label: z.string().min(2).max(40),
  style_variant: z.enum(["light-card", "dark-card", "minimal"]),
});

export const StoryBlockSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string().min(1).max(420),
  suggested_duration_s: z.number().positive().max(20),
});

export const StoryPackageSchema = z.object({
  story_id: z.string().min(4),
  created_at: z.string().datetime(),
  premise: z.string().min(20).max(800),
  hook: z.string().min(8).max(160),
  forum_card: ForumCardSchema,
  confession_voice: z.enum(["first-person", "second-person", "letter"]),
  story_blocks: z.array(StoryBlockSchema).min(2).max(20),
  twist: z.string().min(10).max(400),
  ending_mode: z.enum(["cliffhanger", "bittersweet", "twist", "quiet"]),
  tone: z.enum(["unsettling", "melancholic", "ominous", "reflective", "tense"]),
  intensity: z.enum(["soft", "medium", "high"]),
  background_mood: z.enum(["eerie-room", "rainy-window", "dark-hallway", "empty-street", "vhs-glitch"]),
  music_mood: z.enum(["ambient-drone", "soft-piano", "low-tension", "heartbeat", "static-bass"]),
  tts_voice: z.enum(["am_michael", "am_george", "af_sarah"]),
  cta: z.enum(["none", "follow-for-part-2", "comment-your-take", "share-if-relate"]),
  platform_variants: z.object({
    tiktok_reels: z.object({ pacing: z.enum(["fast", "medium"]) }),
    youtube_shorts: z.object({ pacing: z.enum(["medium", "slow"]) }),
  }),
  generation_prompt_version: z.string().min(1),
  freshness_fingerprint: z.string().length(16),
});
export type ForumCard = z.infer<typeof ForumCardSchema>;
export type StoryBlock = z.infer<typeof StoryBlockSchema>;
export type StoryPackage = z.infer<typeof StoryPackageSchema>;
