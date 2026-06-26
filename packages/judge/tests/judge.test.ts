import { describe, it, expect } from "vitest";
import { judgeSurvivors } from "../src/judge.js";
import { makeStubJudgeLlm } from "../src/llm.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { paths } from "@rcf/core";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

const setup = async () => {
  await mkdir(paths.storiesDir(), { recursive: true });
  await mkdir(paths.scoresDir(), { recursive: true });
  await writeFile(paths.storyJson(validStory.story_id), JSON.stringify(validStory));
  const report = {
    story_id: validStory.story_id,
    heuristic_checks: [{ name: "x", pass: true }],
    heuristic_pass: true,
    accept_decision: "accept" as const,
    reject_reasons: [],
  };
  await writeFile(paths.scoreJson(validStory.story_id), JSON.stringify(report));
};

describe("judgeSurvivors", () => {
  it("accepts a strong story", async () => {
    await setup();
    const stub = makeStubJudgeLlm(
      JSON.stringify({
        hook_strength: 9, escalation: 8, coherence: 8, plausibility: 8, novelty: 8, payoff: 8, ai_smell: 3,
        summary: "Strong, arresting hook.", verdict: "accept",
      })
    );
    const r = await judgeSurvivors([paths.scoreJson(validStory.story_id)], { budgetMax: 1, llm: stub });
    expect(r).toHaveLength(1);
    expect(r[0]!.accept_decision).toBe("accept");
  });

  it("rejects a too-AI-smelling story", async () => {
    await setup();
    const stub = makeStubJudgeLlm(
      JSON.stringify({
        hook_strength: 7, escalation: 6, coherence: 6, plausibility: 6, novelty: 6, payoff: 6, ai_smell: 9,
        summary: "Reads like machine prose.", verdict: "reject",
      })
    );
    const r = await judgeSurvivors([paths.scoreJson(validStory.story_id)], { budgetMax: 1, llm: stub });
    expect(r[0]!.accept_decision).toBe("reject");
  });
});
