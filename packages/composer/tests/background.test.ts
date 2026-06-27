import { describe, it, expect } from "vitest";
import { backgroundPathFor, __test__ } from "../src/background.js";
import { existsSync } from "node:fs";

describe("backgroundPathFor", () => {
  it("resolves to assets dir and exists on disk for dark-hallway", () => {
    const p = backgroundPathFor("dark-hallway", "s_test_001");
    expect(p).toMatch(/dark-hallway[\\/]dark-hallway-\d+\.png$/);
    expect(p.startsWith(__test__.ASSETS)).toBe(true);
    expect(existsSync(p)).toBe(true);
  });

  it("is deterministic: same (mood, storyId) always returns the same file", () => {
    const a = backgroundPathFor("eerie-room", "s_stable_story");
    const b = backgroundPathFor("eerie-room", "s_stable_story");
    expect(a).toBe(b);
  });

  it("distributes: different storyIds often land on different files", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      seen.add(backgroundPathFor("empty-street", `s_distribute_${i}`));
    }
    expect(seen.size).toBeGreaterThanOrEqual(3);
  });

  it("falls back to dark-hallway for unknown moods (e.g. vhs-glitch)", () => {
    const p = backgroundPathFor("vhs-glitch", "s_fallback_test");
    expect(p).toMatch(/dark-hallway[\\/]dark-hallway-\d+\.png$/);
  });

  it("selected file exists on disk", () => {
    const p = backgroundPathFor("rainy-window", "s_exists_test");
    expect(existsSync(p)).toBe(true);
  });

  it("rejects path traversal in mood", () => {
    expect(() => backgroundPathFor("../etc/passwd", "s_test")).toThrow();
    expect(() => backgroundPathFor("dark hallway", "s_test")).toThrow();
  });

  it("rejects empty storyId", () => {
    expect(() => backgroundPathFor("dark-hallway", "")).toThrow();
  });

  it("deterministic for fallback case too (same storyId, unmapped mood)", () => {
    const a = backgroundPathFor("vhs-glitch", "s_fallback_stable");
    const b = backgroundPathFor("vhs-glitch", "s_fallback_stable");
    expect(a).toBe(b);
  });
});
