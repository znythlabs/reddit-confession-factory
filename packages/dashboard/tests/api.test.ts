import { describe, it, expect } from "vitest";
import { readHealth, readAcceptedStories } from "../lib/readers.js";

describe("dashboard readers", () => {
  it("readHealth returns numeric counts", async () => {
    const h = await readHealth();
    expect(typeof h.stories).toBe("number");
    expect(typeof h.failed).toBe("number");
  });
  it("readAcceptedStories returns an array", async () => {
    const items = await readAcceptedStories();
    expect(Array.isArray(items)).toBe(true);
  });
});
