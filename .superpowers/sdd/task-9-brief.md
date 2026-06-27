  metrics: {
    hook_survival_3s: number;
    completion_rate: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
  };
};

export const recordStory = async (story: StoryPackage, platform: string): Promise<void> => {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO stories (story_id, tone, intensity, twist_type, hook_pattern, background_mood, tts_voice, platform, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    story.story_id,
    story.tone,
    story.intensity,
    story.ending_mode,
    story.hook.slice(0, 32),
    story.background_mood,
    story.tts_voice,
    platform,
    story.created_at
  );
};

export const recordOutcome = (i: OutcomeInput): void => {
  const db = getDb();
  db.prepare(
    `INSERT INTO outcomes (story_id, platform, hook_survival_3s, completion_rate, likes, comments, shares, saves, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    i.storyId,
    i.platform,
    i.metrics.hook_survival_3s,
    i.metrics.completion_rate,
    i.metrics.likes,
    i.metrics.comments,
    i.metrics.shares,
    i.metrics.saves,
    new Date().toISOString()
  );
};

export const recordBundle = async (bundle: PublishBundle): Promise<void> => {
  const story = JSON.parse(await readFile(paths.storyJson(bundle.story_id), "utf8")) as StoryPackage;
  await recordStory(story, bundle.platform);
};
```

- [ ] **Step 5: Write `packages/analytics/src/summarize.ts`**

```ts
import { getDb } from "./db.js";

export const summarize = (): {
  byHookPattern: Array<{ key: string; avg_completion: number; n: number }>;
  byTone: Array<{ key: string; avg_completion: number; n: number }>;
  byTwist: Array<{ key: string; avg_completion: number; n: number }>;
  byBackground: Array<{ key: string; avg_completion: number; n: number }>;
  byVoice: Array<{ key: string; avg_completion: number; n: number }>;
} => {
  const db = getDb();
  const group = (col: string) =>
    db
      .prepare(
        `SELECT ${col} AS key, AVG(o.completion_rate) AS avg_completion, COUNT(*) AS n
         FROM outcomes o JOIN stories s ON s.story_id = o.story_id
         WHERE s.${col} IS NOT NULL
         GROUP BY ${col} ORDER BY avg_completion DESC`
      )
      .all() as Array<{ key: string; avg_completion: number; n: number }>;
  return {
    byHookPattern: group("hook_pattern"),
    byTone: group("tone"),
    byTwist: group("twist_type"),
    byBackground: group("background_mood"),
    byVoice: group("tts_voice"),
  };
};
```

- [ ] **Step 6: Write `packages/analytics/src/freshness.ts`**

```ts
import { getDb } from "./db.js";

export const recentHookPatterns = (limit = 50): string[] => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT hook_pattern FROM stories ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as Array<{ hook_pattern: string }>;
  return rows.map((r) => r.hook_pattern);
};
```

- [ ] **Step 7: Write `packages/analytics/src/index.ts`**

```ts
import { summarize } from "./summarize.js";
import { recordOutcome, recordBundle } from "./record.js";

const main = async () => {
  const sum = summarize();
  console.log(JSON.stringify(sum, null, 2));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 8: Write `packages/analytics/tests/record.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "../src/db.js";
import { recordOutcome, recordStory, type OutcomeInput } from "../src/record.js";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

const reset = () => {
  process.env.RCF_VAR_DIR = resolve(process.cwd(), "var/test-analytics");
  rmSync(process.env.RCF_VAR_DIR!, { recursive: true, force: true });
};

describe("analytics", () => {
  beforeEach(reset);

  it("records story + outcome and reads them back", () => {
    recordStory(validStory as any, "tiktok");
    const input: OutcomeInput = {
      storyId: validStory.story_id,
      platform: "tiktok",
      metrics: { hook_survival_3s: 0.7, completion_rate: 0.55, likes: 10, comments: 2, shares: 1, saves: 0 },
    };
    recordOutcome(input);
    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS n FROM outcomes").get() as { n: number };
    expect(row.n).toBe(1);
  });
});
```

- [ ] **Step 9: Write `packages/analytics/tests/summarize.test.ts`**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "../src/db.js";
import { recordStory, recordOutcome } from "../src/record.js";
import { summarize } from "../src/summarize.js";
import { rmSync } from "node:fs";
import { resolve } from "node:path";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

const reset = () => {
  process.env.RCF_VAR_DIR = resolve(process.cwd(), "var/test-analytics-sum");
  rmSync(process.env.RCF_VAR_DIR!, { recursive: true, force: true });
};

describe("summarize", () => {
  beforeEach(reset);

  it("groups by tone", () => {
    recordStory(validStory as any, "tiktok");
    recordOutcome({
      storyId: validStory.story_id,
      platform: "tiktok",
      metrics: { hook_survival_3s: 0.6, completion_rate: 0.4, likes: 1, comments: 0, shares: 0, saves: 0 },
    });
    const s = summarize();
    expect(s.byTone[0]!.key).toBe("unsettling");
    expect(s.byTone[0]!.avg_completion).toBeCloseTo(0.4);
  });
});
```

- [ ] **Step 10: Install and run tests**

Run:
```bash
pnpm --filter @rcf/analytics install
pnpm --filter @rcf/analytics test
```
Expected: 2 tests pass.

- [ ] **Step 11: Commit**

```bash
git add packages/analytics
git commit -m "feat(analytics): sqlite-backed outcomes + breakdowns"
```

---

## Task 10: Orchestrator with role-based subagent dispatch

**Files:**
- Create: `packages/orchestrator/package.json`
- Create: `packages/orchestrator/tsconfig.json`
- Create: `packages/orchestrator/src/batch.ts`
- Create: `packages/orchestrator/src/scheduler.ts`
- Create: `packages/orchestrator/src/roles.ts`
- Create: `packages/orchestrator/src/index.ts`
- Create: `packages/orchestrator/tests/batch.test.ts`

**Interfaces:**
- Produces: `runDailyBatch(opts: { generateCount: number, judgeBudget: number }): Promise<BatchSummary>`
- `BatchSummary = { generated, accepted_by_gate, accepted_by_judge, rendered, bundled, failed }`
- Scheduler: registers `node-cron` job to call `runDailyBatch` once per day at 09:00 local

- [ ] **Step 1: Write `packages/orchestrator/package.json`**

```json
{
  "name": "@rcf/orchestrator",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "start": "tsx src/index.ts",
    "batch": "tsx src/batch.ts"
  },
  "dependencies": {
    "@rcf/core": "workspace:*",
    "@rcf/generator": "workspace:*",
    "@rcf/heuristic": "workspace:*",
    "@rcf/judge": "workspace:*",
    "@rcf/formatter": "workspace:*",
    "@rcf/composer": "workspace:*",
    "@rcf/exporter": "workspace:*",
    "@rcf/analytics": "workspace:*",
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Write `packages/orchestrator/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

- [ ] **Step 3: Write `packages/orchestrator/src/roles.ts`**

```ts
export const ROLES = {
  storyGenerator: "@rcf/generator",
  heuristicGate: "@rcf/heuristic",
  llmStoryJudge: "@rcf/judge",
  scriptFormatter: "@rcf/formatter",
  visualComposer: "@rcf/composer",
  exportPublisher: "@rcf/exporter",
  analyticsTracker: "@rcf/analytics",
} as const;

export type RoleName = keyof typeof ROLES;
```

- [ ] **Step 4: Write `packages/orchestrator/src/batch.ts`**

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const pexec = promisify(execFile);

const run = (pkg: string, script: string, env: Record<string, string> = {}) =>
  pexec("pnpm", ["--filter", pkg, "run", script], {
    cwd: path.resolve(process.cwd()),
    env: { ...process.env, ...env },
  });

export type BatchSummary = {
  generated: number;
  accepted_by_gate: number;
  accepted_by_judge: number;
  rendered: number;
  bundled: number;
