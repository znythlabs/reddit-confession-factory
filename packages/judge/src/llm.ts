export interface JudgeLlm {
  judge(system: string, user: string): Promise<string>;
}

const DEFAULT_STUB_RESPONSE = JSON.stringify({
  hook_strength: 7,
  escalation: 7,
  coherence: 7,
  plausibility: 7,
  novelty: 7,
  payoff: 7,
  ai_smell: 5,
  summary: "stub judge: accept",
});

export const makeStubJudgeLlm = (response: string = DEFAULT_STUB_RESPONSE): JudgeLlm => ({
  async judge() { return response; },
});
