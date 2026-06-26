export interface JudgeLlm {
  judge(system: string, user: string): Promise<string>;
}

export const makeStubJudgeLlm = (response: string): JudgeLlm => ({
  async judge() { return response; },
});
