import { describe, it, expect } from "vitest";
import { formatStoryPackage } from "../src/format.js";
import { RenderPackageSchema, StoryPackageSchema, type StoryPackage, type ScoreReport } from "@rcf/core";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

const story: StoryPackage = StoryPackageSchema.parse(validStory);

const acceptScore: ScoreReport = {
  story_id: story.story_id,
  heuristic_checks: [],
  heuristic_pass: true,
  accept_decision: "accept",
  reject_reasons: [],
};

describe("formatStoryPackage", () => {
  it("produces a valid render package for tiktok_reels", async () => {
    const pkg = await formatStoryPackage(story, acceptScore, { platform: "tiktok_reels" });
    expect(() => RenderPackageSchema.parse(pkg)).not.toThrow();
    expect(pkg.scene_plan.scenes[0]!.kind).toBe("hook-card");
    expect(pkg.scene_plan.scenes.at(-1)!.kind).toBe("outro");
  });

  it("rejects render packages that would exceed 60 seconds", async () => {
    const tooLong: StoryPackage = {
      ...story,
      story_blocks: Array.from({ length: 7 }, (_, i) => ({
        index: i,
        text: `Long block ${i + 1}`,
        suggested_duration_s: 12,
      })),
    };
    await expect(formatStoryPackage(tooLong, acceptScore, { platform: "youtube_shorts" }))
      .rejects
      .toThrow(/exceeds 60s/);
  });
});
