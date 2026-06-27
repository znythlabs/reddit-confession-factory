import { getDb } from "./db.js";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Dirent } from "node:fs";
import { paths, type StoryPackage, type PublishBundle } from "@rcf/core";
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

export const recordAll = async (): Promise<number> => {
  const root = paths.bundlesDir();
  let dirs: Dirent[] = [];
  try { dirs = await readdir(root, { withFileTypes: true }); } catch { return 0; }
  let n = 0;
  for (const sd of dirs) {
    if (!sd.isDirectory()) continue;
    const subs = await readdir(path.join(root, sd.name), { withFileTypes: true }).catch(() => []);
    for (const s of subs) {
      if (!s.isDirectory()) continue;
      try {
        const raw = await readFile(path.join(root, sd.name, s.name, "bundle.json"), "utf8");
        await recordBundle(JSON.parse(raw) as PublishBundle);
        n++;
      } catch { /* skip incomplete */ }
    }
  }
  return n;
};
