import { describe, it, expect } from "vitest";
import { buildCaption, buildHashtags, buildTitles } from "../src/captions.js";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };
import { StoryPackageSchema, type StoryPackage } from "@rcf/core";

const story: StoryPackage = StoryPackageSchema.parse(validStory);

describe("captions", () => {
  it("caption includes the hook and a CTA when applicable", () => {
    const c = buildCaption(story);
    expect(c).toContain(story.hook);
    expect(c).toContain("comments");
  });
  it("hashtags return 2-15 entries", () => {
    const h = buildHashtags(story);
    expect(h.length).toBeGreaterThanOrEqual(2);
    expect(h.length).toBeLessThanOrEqual(15);
  });
  it("titles return 1-3 entries", () => {
    const t = buildTitles(story);
    expect(t.length).toBeGreaterThanOrEqual(1);
    expect(t.length).toBeLessThanOrEqual(3);
  });
});
