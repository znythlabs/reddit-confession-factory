import { describe, it, expect } from "vitest";
import {
  readHealth,
  readAcceptedStories,
  readRenderPackages,
  countActualMp4Renders,
  countMissingMp4s,
} from "../lib/readers.js";

describe("dashboard readers", () => {
  it("readHealth returns all numeric counts", async () => {
    const h = await readHealth();
    for (const k of [
      "generated", "scores", "accepted", "rejected",
      "renderPackages", "mp4Renders", "bundles", "missingMp4s",
    ] as const) {
      expect(typeof h[k]).toBe("number");
    }
  });

  it("readHealth invariant: renderPackages = mp4Renders + missingMp4s", async () => {
    const h = await readHealth();
    expect(h.renderPackages).toBe(h.mp4Renders + h.missingMp4s);
  });

  it("readHealth invariant: mp4Renders <= renderPackages", async () => {
    const h = await readHealth();
    expect(h.mp4Renders).toBeLessThanOrEqual(h.renderPackages);
  });

  it("readAcceptedStories returns an array", async () => {
    const items = await readAcceptedStories();
    expect(Array.isArray(items)).toBe(true);
  });

  it("readRenderPackages returns an array", async () => {
    const pkgs = await readRenderPackages();
    expect(Array.isArray(pkgs)).toBe(true);
  });

  it("countActualMp4Renders and countMissingMp4s agree with readHealth", async () => {
    const h = await readHealth();
    const mp4 = await countActualMp4Renders();
    const missing = await countMissingMp4s();
    expect(mp4).toBe(h.mp4Renders);
    expect(missing).toBe(h.missingMp4s);
  });
});
