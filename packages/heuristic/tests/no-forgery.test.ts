import { describe, it, expect } from "vitest";
import { noForgery } from "../src/no-forgery.js";
import { StoryPackageSchema, type StoryPackage } from "@rcf/core";
import forgedJson from "./fixtures/forged-votes.json" assert { type: "json" };
import realSubJson from "./fixtures/real-subreddit.json" assert { type: "json" };
import validJson from "./fixtures/valid-story.json" assert { type: "json" };

// Forged/real-subreddit fixtures intentionally violate StoryPackageSchema; cast through unknown.
const forged = forgedJson as unknown as StoryPackage;
const realSub = realSubJson as unknown as StoryPackage;
const valid = StoryPackageSchema.parse(validJson);

describe("noForgery", () => {
  it("passes clean stories", () => {
    const r = noForgery(valid);
    expect(r.pass).toBe(true);
    expect(r.hits).toEqual([]);
  });
  it("flags forged engagement metrics", () => {
    const r = noForgery(forged);
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.includes("votes"))).toBe(true);
  });
  it("flags real subreddit references", () => {
    const r = noForgery(realSub);
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.includes("real subreddit"))).toBe(true);
  });
});
