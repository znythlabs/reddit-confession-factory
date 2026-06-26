import { describe, it, expect } from "vitest";
import {
  StoryPackageSchema,
  ForumCardSchema,
  ScoreReportSchema,
  RenderPackageSchema,
  PublishBundleSchema,
} from "../src/index.js";

const baseStory = {
  story_id: "s_test0001",
  created_at: new Date().toISOString(),
  premise: "A late-night confession from a building superintendent.",
  hook: "I should not have opened the basement door that night.",
  forum_card: {
    display_title: "Confession: I opened the wrong door",
    fictional_handle: "throwaway_nightshift_42",
    fictional_community_label: "confessions",
    relative_time_label: "2 hours ago",
    style_variant: "dark-card",
  },
  confession_voice: "first-person",
  story_blocks: [
    { index: 0, text: "It was the third night in a row the basement light flickered.", suggested_duration_s: 6 },
    { index: 1, text: "I told myself it was just a bulb.", suggested_duration_s: 4 },
  ],
  twist: "There was no bulb. The light had been coming up the stairs.",
  ending_mode: "twist",
  tone: "unsettling",
  intensity: "medium",
  background_mood: "dark-hallway",
  music_mood: "low-tension",
  tts_voice: "am_michael",
  cta: "comment-your-take",
  platform_variants: {
    tiktok_reels: { pacing: "fast" },
    youtube_shorts: { pacing: "medium" },
  },
  generation_prompt_version: "v1",
  freshness_fingerprint: "0123456789abcdef",
};

describe("StoryPackageSchema", () => {
  it("accepts a valid story", () => {
    expect(() => StoryPackageSchema.parse(baseStory)).not.toThrow();
  });
  it("rejects a too-long hook", () => {
    const bad = { ...baseStory, hook: "x".repeat(300) };
    expect(() => StoryPackageSchema.parse(bad)).toThrow();
  });
});

describe("ScoreReportSchema", () => {
  it("requires accept_decision", () => {
    const bad = { story_id: "s_test0001", heuristic_checks: [], heuristic_pass: true, reject_reasons: [] };
    expect(() => ScoreReportSchema.parse(bad)).toThrow();
  });
});

describe("RenderPackageSchema", () => {
  it("accepts a minimal package", () => {
    const pkg = {
      story_id: "s_test0001",
      scene_plan: { scenes: [] },
      timing_map: {},
      background_assets: [],
      audio_assets: [],
      render_targets: [{ platform: "tiktok_reels", out_path: "out.mp4" }],
    };
    expect(() => RenderPackageSchema.parse(pkg)).not.toThrow();
  });
});

describe("PublishBundleSchema", () => {
  it("rejects too few hashtags", () => {
    const bad = {
      story_id: "s_test0001",
      platform: "tiktok",
      video_path: "out.mp4",
      caption: "long enough caption for sure",
      title_options: ["Title"],
      hashtags: ["#one"],
      status: "draft",
    };
    expect(() => PublishBundleSchema.parse(bad)).toThrow();
  });
});
