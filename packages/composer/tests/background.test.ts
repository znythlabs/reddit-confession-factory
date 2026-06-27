import { describe, it, expect } from "vitest";
import { backgroundPathFor } from "../src/background.js";
import path from "node:path";

describe("backgroundPathFor", () => {
  it("resolves to assets dir", () => {
    const p = backgroundPathFor("dark-hallway");
    expect(p.endsWith("dark-hallway.mp4")).toBe(true);
  });
  it("rejects path traversal", () => {
    expect(() => backgroundPathFor("../etc/passwd")).toThrow();
  });
});
