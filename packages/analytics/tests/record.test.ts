import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "../src/db.js";
import { recordOutcome, recordStory, type OutcomeInput } from "../src/record.js";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { StoryPackageSchema, type StoryPackage } from "@rcf/core";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

const story: StoryPackage = StoryPackageSchema.parse(validStory);

const reset = () => {
  process.env.RCF_VAR_DIR = resolve(process.cwd(), "var/test-analytics");
  rmSync(process.env.RCF_VAR_DIR!, { recursive: true, force: true });
};

describe("analytics", () => {
  beforeEach(reset);

  it("records story + outcome and reads them back", () => {
    recordStory(story, "tiktok");
    const input: OutcomeInput = {
      storyId: story.story_id,
      platform: "tiktok",
      metrics: { hook_survival_3s: 0.7, completion_rate: 0.55, likes: 10, comments: 2, shares: 1, saves: 0 },
    };
    recordOutcome(input);
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS n FROM outcomes").get() as { n: number };
    expect(row.n).toBe(1);
  });
});
