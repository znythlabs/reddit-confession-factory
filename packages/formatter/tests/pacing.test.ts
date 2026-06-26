import { describe, it, expect } from "vitest";
import { pacingFactor, adjustDuration } from "../src/pacing.js";

describe("pacing", () => {
  it("tiktok fast -> 0.85", () => {
    expect(pacingFactor("tiktok_reels", "fast")).toBe(0.85);
  });
  it("shorts slow -> 1.2", () => {
    expect(pacingFactor("youtube_shorts", "slow")).toBe(1.2);
  });
  it("adjustDuration floors at 2s", () => {
    expect(adjustDuration(1, 0.1)).toBe(2);
  });
});
