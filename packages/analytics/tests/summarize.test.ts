import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "../src/db.js";
import { recordStory, recordOutcome } from "../src/record.js";
import { summarize } from "../src/summarize.js";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { StoryPackageSchema, type StoryPackage } from "@rcf/core";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

const story: StoryPackage = StoryPackageSchema.parse(validStory);

const reset = () => {
  process.env.RCF_VAR_DIR = resolve(process.cwd(), "var/test-analytics-sum");
  rmSync(process.env.RCF_VAR_DIR!, { recursive: true, force: true });
};

describe("summarize", () => {
  beforeEach(reset);

  it("groups by tone", () => {
    recordStory(story, "tiktok");
    recordOutcome({
      storyId: story.story_id,
      platform: "tiktok",
      metrics: { hook_survival_3s: 0.6, completion_rate: 0.4, likes: 1, comments: 0, shares: 0, saves: 0 },
    });
    const s = summarize();
    expect(s.byTone[0]!.key).toBe("unsettling");
    expect(s.byTone[0]!.avg_completion).toBeCloseTo(0.4);
  });
});
