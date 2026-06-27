import { describe, it, expect } from "vitest";
import { StoryPackageSchema } from "@rcf/core";
import { renderHookCardHtml } from "../src/hook-card.js";
import validStoryData from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

const validStory = StoryPackageSchema.parse(validStoryData);

describe("renderHookCardHtml", () => {
  it("includes the fictional handle and title", () => {
    const html = renderHookCardHtml(validStory);
    expect(html).toContain(validStory.forum_card.fictional_handle);
    expect(html).toContain(validStory.forum_card.display_title);
  });
  it("does not include forged engagement fields even if added to story", () => {
    const html = renderHookCardHtml(validStory);
    expect(html).not.toContain("votes");
    expect(html).not.toContain("karma");
    expect(html).not.toContain("comments");
  });
});
