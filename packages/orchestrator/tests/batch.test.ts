import { describe, it, expect } from "vitest";
import { ROLES } from "../src/roles.js";

describe("roles", () => {
  it("has exactly 7 roles", () => {
    expect(Object.keys(ROLES)).toHaveLength(7);
  });
  it("includes the seven named roles", () => {
    expect(ROLES.storyGenerator).toBe("@rcf/generator");
    expect(ROLES.heuristicGate).toBe("@rcf/heuristic");
    expect(ROLES.llmStoryJudge).toBe("@rcf/judge");
    expect(ROLES.scriptFormatter).toBe("@rcf/formatter");
    expect(ROLES.visualComposer).toBe("@rcf/composer");
    expect(ROLES.exportPublisher).toBe("@rcf/exporter");
    expect(ROLES.analyticsTracker).toBe("@rcf/analytics");
  });
});
