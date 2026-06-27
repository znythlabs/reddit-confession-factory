  bundled: number;
  failed: number;
};

export const runDailyBatch = async (opts: { generateCount: number; judgeBudget: number }): Promise<BatchSummary> => {
  const summary: BatchSummary = { generated: 0, accepted_by_gate: 0, accepted_by_judge: 0, rendered: 0, bundled: 0, failed: 0 };
  try {
    await run("@rcf/generator", "start", { RCF_GENERATE_COUNT: String(opts.generateCount) });
    summary.generated = opts.generateCount;
    await run("@rcf/heuristic", "start");
    await run("@rcf/judge", "start", { RCF_JUDGE_BUDGET: String(opts.judgeBudget) });
    await run("@rcf/formatter", "start");
    await run("@rcf/composer", "start");
    await run("@rcf/exporter", "start");
    summary.rendered = opts.generateCount;
    summary.bundled = opts.generateCount;
  } catch (e) {
    summary.failed++;
    console.error("batch failure:", e);
  }
  return summary;
};
```

- [ ] **Step 5: Write `packages/orchestrator/src/scheduler.ts`**

```ts
import cron from "node-cron";
import { runDailyBatch } from "./batch.js";

export const startScheduler = (): void => {
  cron.schedule("0 9 * * *", async () => {
    const s = await runDailyBatch({ generateCount: 25, judgeBudget: 8 });
    console.log("daily batch:", s);
  });
  console.log("scheduler: daily 09:00 registered");
};
```

- [ ] **Step 6: Write `packages/orchestrator/src/index.ts`**

```ts
import { startScheduler } from "./scheduler.js";
startScheduler();
```

- [ ] **Step 7: Write `packages/orchestrator/tests/batch.test.ts`**

```ts
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
```

- [ ] **Step 8: Install and run tests**

Run:
```bash
pnpm --filter @rcf/orchestrator install
pnpm --filter @rcf/orchestrator test
```
Expected: 2 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/orchestrator
git commit -m "feat(orchestrator): role registry + daily batch + scheduler"
```

---

## Task 11: Observer-only dashboard (Next.js 14)

**Files:**
- Create: `packages/dashboard/package.json`
- Create: `packages/dashboard/next.config.mjs`
- Create: `packages/dashboard/tailwind.config.ts`
- Create: `packages/dashboard/postcss.config.mjs`
- Create: `packages/dashboard/tsconfig.json`
- Create: `packages/dashboard/app/layout.tsx`
- Create: `packages/dashboard/app/page.tsx`
- Create: `packages/dashboard/app/stories/page.tsx`
- Create: `packages/dashboard/app/schedules/page.tsx`
- Create: `packages/dashboard/app/outcomes/page.tsx`
- Create: `packages/dashboard/app/logs/page.tsx`
- Create: `packages/dashboard/app/api/stories/route.ts`
- Create: `packages/dashboard/app/api/health/route.ts`
- Create: `packages/dashboard/app/api/outcomes/route.ts`
- Create: `packages/dashboard/lib/readers.ts`
- Create: `packages/dashboard/lib/format.ts`
- Create: `packages/dashboard/tests/api.test.ts`

**Interfaces:**
- Page: `/` shows pipeline health (counts by stage, recent failures)
- Page: `/stories` lists accepted stories with hook + score summary
- Page: `/schedules` shows queued/exported bundles
- Page: `/outcomes` shows breakdowns by hook/tone/twist/background/voice
- Page: `/logs` shows recent log lines
- API: `GET /api/stories` returns list of accepted stories (read-only)
- API: `GET /api/health` returns counts by stage
- API: `GET /api/outcomes` returns summarize() output

- [ ] **Step 1: Write `packages/dashboard/package.json`**

```json
{
  "name": "@rcf/dashboard",
  "version": "0.0.0",
  "private": true,
  "scripts": { "dev": "next dev -p 3001", "build": "next build", "start": "next start -p 3001", "test": "vitest run" },
  "dependencies": { "@rcf/core": "workspace:*", "@rcf/analytics": "workspace:*", "next": "14.2.0", "react": "18.3.0", "react-dom": "18.3.0" },
  "devDependencies": { "@types/react": "18.3.0", "@types/react-dom": "18.3.0", "autoprefixer": "^10.4.0", "postcss": "^8.4.0", "tailwindcss": "^3.4.0", "typescript": "^5.4.0", "vitest": "^1.6.0" }
}
```

- [ ] **Step 2: Write `packages/dashboard/next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = { transpilePackages: ["@rcf/core", "@rcf/analytics"] };
export default nextConfig;
```

- [ ] **Step 3: Write `packages/dashboard/tailwind.config.ts`**

```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1c1a18",
        parchment: "#f7f4ef",
        accent: "#b1351f",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 4: Write `packages/dashboard/postcss.config.mjs`**

```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 5: Write `packages/dashboard/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "preserve", "module": "esnext", "moduleResolution": "bundler", "outDir": ".next" },
  "include": ["app", "lib"]
}
```

- [ ] **Step 6: Write `packages/dashboard/lib/readers.ts`**

```ts
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { paths, type StoryPackage, type ScoreReport, type RenderPackage, type PublishBundle } from "@rcf/core";

export type HealthCounts = { stories: number; scores: number; render: number; bundles: number; failed: number };

export const readHealth = async (): Promise<HealthCounts> => {
  const stories = (await readdir(paths.storiesDir()).catch(() => [])).filter((f) => f.endsWith(".json")).length;
  const scores = (await readdir(paths.scoresDir()).catch(() => [])).filter((f) => f.endsWith(".json"));
  const scoreReports = await Promise.all(
    scores.map(async (f) => JSON.parse(await readFile(path.join(paths.scoresDir(), f), "utf8")) as ScoreReport)
  );
  const failed = scoreReports.filter((r) => r.accept_decision === "reject").length;
  const render = (await readdir(paths.renderDir()).catch(() => [])).filter((f) => f.endsWith(".json")).length;
  const bundles = (await readdir(paths.bundlesDir()).catch(() => [])).filter((f) => f.endsWith(".json")).length;
  return { stories, scores: scores.length, render, bundles, failed };
};
