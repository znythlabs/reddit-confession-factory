## Task 5: LLM Story Judge role (batch-budgeted)

**Files:**
- Create: `packages/judge/package.json`
- Create: `packages/judge/tsconfig.json`
- Create: `packages/judge/src/index.ts`
- Create: `packages/judge/src/llm.ts`
- Create: `packages/judge/src/rubric.ts`
- Create: `packages/judge/src/judge.ts`
- Create: `packages/judge/tests/judge.test.ts`

**Interfaces:**
- Consumes: survivors from `@rcf/heuristic` (path lookup)
- Produces: `judgeSurvivors(scorePaths: string[], opts: { budgetMax: number }): Promise<ScoreReport[]>`
- The `opts.budgetMax` caps how many stories the LLM call is allowed to spend budget on (default 8)

- [ ] **Step 1: Write `packages/judge/package.json`**

```json
{
  "name": "@rcf/judge",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": { "build": "tsc", "test": "vitest run", "start": "tsx src/index.ts" },
  "dependencies": { "@rcf/core": "workspace:*", "zod": "^3.23.8" },
  "devDependencies": { "tsx": "^4.7.0", "typescript": "^5.4.0", "vitest": "^1.6.0" }
}
```

- [ ] **Step 2: Write `packages/judge/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

- [ ] **Step 3: Write `packages/judge/src/llm.ts`**

```ts
export interface JudgeLlm {
  judge(system: string, user: string): Promise<string>;
}

export const makeStubJudgeLlm = (response: string): JudgeLlm => ({
  async judge() { return response; },
});
```

- [ ] **Step 4: Write `packages/judge/src/rubric.ts`**

```ts
export const RUBRIC_VERSION = "judge-v1";

export const RUBRIC_SYSTEM = `
You are a strict editor scoring short fictional confession stories for a
faceless vertical video channel. Score 0-10 on each axis. Be conservative:
a 7+ hook must be genuinely arresting, not merely competent. Higher
"ai_smell" is worse. Return JSON only.
`.trim();

export const RUBRIC_TEMPLATE = (story: object) => `
Story:
${JSON.stringify(story, null, 2)}

Output JSON only, schema:
{ "hook_strength": number, "escalation": number, "coherence": number,
  "plausibility": number, "novelty": number, "payoff": number,
  "ai_smell": number, "summary": string, "verdict": "accept" | "reject" }
`.trim();
```

- [ ] **Step 5: Write `packages/judge/src/judge.ts`**

```ts
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { ScoreReportSchema, type StoryPackage, type ScoreReport, paths, JudgeScoresSchema } from "@rcf/core";
import { makeStubJudgeLlm, type JudgeLlm } from "./llm.js";
import { RUBRIC_SYSTEM, RUBRIC_TEMPLATE, RUBRIC_VERSION } from "./rubric.js";

const ACCEPT_FLOOR = 6.5;
const AI_SMELL_CEILING = 6.0;

export const judgeSurvivors = async (
  scorePaths: string[],
  opts: { budgetMax: number; llm?: JudgeLlm } = { budgetMax: 8 }
): Promise<ScoreReport[]> => {
  const llm = opts.llm ?? makeStubJudgeLlm("{}");
  const out: ScoreReport[] = [];
  const limited = scorePaths.slice(0, opts.budgetMax);
  for (const sp of limited) {
    const scoreReport = JSON.parse(await readFile(sp, "utf8")) as ScoreReport;
    if (!scoreReport.heuristic_pass) continue;
    const storyId = scoreReport.story_id;
    const story = JSON.parse(await readFile(paths.storyJson(storyId), "utf8")) as StoryPackage;
    const raw = await llm.judge(RUBRIC_SYSTEM, RUBRIC_TEMPLATE(story));
    const parsed = JSON.parse(raw);
    const scores = JudgeScoresSchema.parse({
      hook_strength: parsed.hook_strength,
      escalation: parsed.escalation,
      coherence: parsed.coherence,
      plausibility: parsed.plausibility,
      novelty: parsed.novelty,
      payoff: parsed.payoff,
      ai_smell: parsed.ai_smell,
    });
    const avg =
      (scores.hook_strength + scores.escalation + scores.coherence + scores.plausibility + scores.novelty + scores.payoff) /
      6;
    const verdict = avg >= ACCEPT_FLOOR && scores.ai_smell <= AI_SMELL_CEILING ? "accept" : "reject";
    const updated: ScoreReport = ScoreReportSchema.parse({
      ...scoreReport,
      judge_scores: scores,
      judge_summary: parsed.summary ?? "",
      accept_decision: verdict,
      reject_reasons:
        verdict === "reject"
          ? [
              ...scoreReport.reject_reasons,
              `judge: avg=${avg.toFixed(2)} ai_smell=${scores.ai_smell}`,
              `prompt_version=${RUBRIC_VERSION}`,
            ]
          : scoreReport.reject_reasons,
    });
    await mkdir(paths.scoresDir(), { recursive: true });
    await writeFile(paths.scoreJson(storyId), JSON.stringify(updated, null, 2));
    out.push(updated);
  }
  return out;
};
```

- [ ] **Step 6: Write `packages/judge/src/index.ts`**

```ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths } from "@rcf/core";
import { judgeSurvivors } from "./judge.js";

const main = async () => {
  const dir = paths.scoresDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  const allPaths = files.map((f) => path.join(dir, f));
  const reports = await judgeSurvivors(allPaths, { budgetMax: Number(process.env.RCF_JUDGE_BUDGET ?? "8") });
  const accepted = reports.filter((r) => r.accept_decision === "accept").length;
  console.log(`judge: ${accepted}/${reports.length} accepted`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 7: Write `packages/judge/tests/judge.test.ts`**

```ts
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
```

- [ ] **Step 8: Install and run tests**

Run:
```bash
pnpm --filter @rcf/judge install
pnpm --filter @rcf/judge test
```
Expected: 2 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/judge
git commit -m "feat(judge): batch-budgeted LLM judge with floor + ai_smell ceiling"
```
