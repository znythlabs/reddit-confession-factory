import { getDb } from "./db.js";
import { readFile } from "node:fs/promises";
import { paths, type StoryPackage, type PublishBundle, PublishBundleSchema } from "@rcf/core";
export type OutcomeInput = {
  storyId: string;
  platform: "tiktok" | "instagram_reels" | "youtube_shorts";
  metrics: {
    hook_survival_3s: number;
    completion_rate: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
};

export const recordStory = async (story: StoryPackage, platform: string): Promise<void> => {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO stories (story_id, tone, intensity, twist_type, hook_pattern, background_mood, tts_voice, platform, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    story.story_id,
    story.tone,
    story.intensity,
    story.ending_mode,
    story.hook.slice(0, 32),
    story.background_mood,
    story.tts_voice,
    platform,
    story.created_at
  );
};

export const recordOutcome = (i: OutcomeInput): void => {
  const db = getDb();
  db.prepare(
    `INSERT INTO outcomes (story_id, platform, hook_survival_3s, completion_rate, likes, comments, shares, saves, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    i.storyId,
    i.platform,
    i.metrics.hook_survival_3s,
    i.metrics.completion_rate,
    i.metrics.likes,
    i.metrics.comments,
    i.metrics.shares,
    i.metrics.saves,
    new Date().toISOString()
  );
};

export const recordBundle = async (bundle: PublishBundle): Promise<void> => {
  const story = JSON.parse(await readFile(paths.storyJson(bundle.story_id), "utf8")) as StoryPackage;
  await recordStory(story, bundle.platform);
};
