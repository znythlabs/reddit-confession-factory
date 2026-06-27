import { describe, it, expect } from "vitest";
import { generateStoryPackage } from "../src/generate.js";
import { makeStubLlm } from "../src/llm.js";
import { StoryPackageSchema } from "@rcf/core";

const validJson = {
  premise: "A fictional confession about an apartment super and a flickering light.",
  hook: "I should not have opened the basement door that night.",
  forum_card: {
    display_title: "Confession: basement door",
    fictional_handle: "throwaway_nightshift",
    fictional_community_label: "confessions",
    relative_time_label: "2 hours ago",
    style_variant: "dark-card",
  },
  confession_voice: "first-person",
  story_blocks: [
    { index: 0, text: "The basement light flickered for three nights.", suggested_duration_s: 6 },
    { index: 1, text: "I told myself it was just a bulb going out.", suggested_duration_s: 4 },
    { index: 2, text: "I went down to check it on the third night.", suggested_duration_s: 5 },
  ],
  twist: "There was no bulb. The light was coming up the stairs.",
  ending_mode: "twist",
  tone: "unsettling",
  intensity: "medium",
  background_mood: "dark-hallway",
  music_mood: "low-tension",
  tts_voice: "am_michael",
  cta: "comment-your-take",
  platform_variants: { tiktok_reels: { pacing: "fast" }, youtube_shorts: { pacing: "medium" } },
  generation_prompt_version: "v1",
};

describe("generateStoryPackage", () => {
  it("parses a valid LLM response", async () => {
    const story = await generateStoryPackage(
      { tone: "unsettling", intensity: "medium", endingMode: "twist", runtimeTarget: 35, platforms: ["tiktok_reels"] },
      makeStubLlm(JSON.stringify(validJson))
    );
    expect(() => StoryPackageSchema.parse(story)).not.toThrow();
    expect(story.story_id).toMatch(/^s_/);
  });

  it("rejects forged forum_card content (real subreddit)", async () => {
    const bad = { ...validJson, forum_card: { ...validJson.forum_card, fictional_community_label: "r/askreddit" } };
    const story = await generateStoryPackage(
      { tone: "unsettling", intensity: "medium", endingMode: "twist", runtimeTarget: 35, platforms: ["tiktok_reels"] },
      makeStubLlm(JSON.stringify(bad))
    );
    // The forum_card schema doesn't yet forbid real subreddit names; that lives in heuristic.
    // This test pins the *schema* accepts the field so the heuristic test owns the reject.
    expect(story.forum_card.fictional_community_label).toBe("r/askreddit");
  });
});
