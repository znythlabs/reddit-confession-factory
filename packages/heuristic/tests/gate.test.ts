import { describe, it, expect } from "vitest";
import { runHeuristicGate } from "../src/gate.js";
import { StoryPackageSchema, type StoryPackage } from "@rcf/core";
import validJson from "./fixtures/valid-story.json" assert { type: "json" };
import forgedJson from "./fixtures/forged-votes.json" assert { type: "json" };
import realSubJson from "./fixtures/real-subreddit.json" assert { type: "json" };

// Forged/real-subreddit fixtures intentionally violate StoryPackageSchema; cast through unknown.
const forged = forgedJson as unknown as StoryPackage;
const realSub = realSubJson as unknown as StoryPackage;
const valid = StoryPackageSchema.parse(validJson);

describe("runHeuristicGate", () => {
  it("accepts a clean story", async () => {
    const r = await runHeuristicGate(valid);
    expect(r.accept_decision).toBe("accept");
  });

  it("rejects forged forum_card engagement metrics", async () => {
    const r = await runHeuristicGate(forged);
    expect(r.accept_decision).toBe("reject");
    expect(r.reject_reasons.some((x) => x.includes("forbidden field"))).toBe(true);
  });

  it("rejects real subreddit labels", async () => {
    const r = await runHeuristicGate(realSub);
    expect(r.accept_decision).toBe("reject");
    expect(r.reject_reasons.some((x) => x.includes("real subreddit"))).toBe(true);
  });
});
