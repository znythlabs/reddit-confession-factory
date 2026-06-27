## Task 2: Shared schemas in `@rcf/core`

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/src/schemas/story.ts`
- Create: `packages/core/src/schemas/score.ts`
- Create: `packages/core/src/schemas/render.ts`
- Create: `packages/core/src/schemas/bundle.ts`
- Create: `packages/core/src/paths.ts`
- Create: `packages/core/src/ids.ts`
- Create: `packages/core/tests/schemas.test.ts`

**Interfaces:**
- Produces: `zod` schemas: `StoryPackageSchema`, `ScoreReportSchema`, `RenderPackageSchema`, `PublishBundleSchema`
- Produces: `paths.storiesDir()`, `paths.scoresDir()`, `paths.renderDir()`, `paths.bundlesDir()`, `paths.logsDir()` — return `path.join(varDir, 'artifacts', ...)`
- Produces: `ids.newStoryId()`, `ids.newBatchId()` — short ULID-like strings

- [ ] **Step 1: Write `packages/core/package.json`**

```json
{
  "name": "@rcf/core",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": { "build": "tsc", "test": "vitest run" },
  "dependencies": { "zod": "^3.23.8" },
  "devDependencies": { "typescript": "^5.4.0", "vitest": "^1.6.0" }
}
```

- [ ] **Step 2: Write `packages/core/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `packages/core/src/schemas/story.ts`**

```ts
import { z } from "zod";

export const ForumCardSchema = z.object({
  display_title: z.string().min(3).max(140),
  fictional_handle: z.string().min(2).max(40),
  fictional_community_label: z.string().min(2).max(60),
  relative_time_label: z.string().min(2).max(40),
  style_variant: z.enum(["light-card", "dark-card", "minimal"]),
});

export const StoryBlockSchema = z.object({
  index: z.number().int().nonnegative(),
  text: z.string().min(1).max(420),
  suggested_duration_s: z.number().positive().max(20),
});

export const StoryPackageSchema = z.object({
  story_id: z.string().min(4),
  created_at: z.string().datetime(),
  premise: z.string().min(20).max(800),
  hook: z.string().min(8).max(160),
  forum_card: ForumCardSchema,
  confession_voice: z.enum(["first-person", "second-person", "letter"]),
  story_blocks: z.array(StoryBlockSchema).min(2).max(20),
  twist: z.string().min(10).max(400),
  ending_mode: z.enum(["cliffhanger", "bittersweet", "twist", "quiet"]),
  tone: z.enum(["unsettling", "melancholic", "ominous", "reflective", "tense"]),
  intensity: z.enum(["soft", "medium", "high"]),
  background_mood: z.enum(["eerie-room", "rainy-window", "dark-hallway", "empty-street", "vhs-glitch"]),
  music_mood: z.enum(["ambient-drone", "soft-piano", "low-tension", "heartbeat", "static-bass"]),
  tts_voice: z.enum(["am_michael", "am_george", "af_sarah"]),
  cta: z.enum(["none", "follow-for-part-2", "comment-your-take", "share-if-relate"]),
  platform_variants: z.object({
    tiktok_reels: z.object({ pacing: z.enum(["fast", "medium"]) }),
    youtube_shorts: z.object({ pacing: z.enum(["medium", "slow"]) }),
  }),
  generation_prompt_version: z.string().min(1),
  freshness_fingerprint: z.string().length(16),
});
```

- [ ] **Step 4: Write `packages/core/src/schemas/score.ts`**

```ts
import { z } from "zod";

export const HeuristicCheckSchema = z.object({
  name: z.string(),
  pass: z.boolean(),
  detail: z.string().optional(),
});

export const JudgeScoresSchema = z.object({
  hook_strength: z.number().min(0).max(10),
  escalation: z.number().min(0).max(10),
  coherence: z.number().min(0).max(10),
  plausibility: z.number().min(0).max(10),
  novelty: z.number().min(0).max(10),
  payoff: z.number().min(0).max(10),
  ai_smell: z.number().min(0).max(10), // higher = more obviously machine-written
});

export const ScoreReportSchema = z.object({
  story_id: z.string(),
  heuristic_checks: z.array(HeuristicCheckSchema),
  heuristic_pass: z.boolean(),
  judge_scores: JudgeScoresSchema.optional(),
  judge_summary: z.string().max(800).optional(),
  accept_decision: z.enum(["accept", "reject"]),
  reject_reasons: z.array(z.string()),
});
```

- [ ] **Step 5: Write `packages/core/src/schemas/render.ts`**

```ts
import { z } from "zod";

export const ScenePlanSchema = z.object({
  scenes: z.array(
    z.object({
      scene_id: z.string(),
      kind: z.enum(["hook-card", "story-block", "twist", "outro"]),
      start_s: z.number().nonnegative(),
      duration_s: z.number().positive(),
      text: z.string().optional(),
      background_mood: z.string().optional(),
    })
  ),
});

export const RenderPackageSchema = z.object({
  story_id: z.string(),
  scene_plan: ScenePlanSchema,
  timing_map: z.record(z.string(), z.number().nonnegative()),
  background_assets: z.array(z.string()),
  audio_assets: z.array(z.string()),
  render_targets: z.array(
    z.object({
      platform: z.enum(["tiktok_reels", "youtube_shorts"]),
      out_path: z.string(),
    })
  ),
});
```

- [ ] **Step 6: Write `packages/core/src/schemas/bundle.ts`**

```ts
import { z } from "zod";

export const PublishBundleSchema = z.object({
  story_id: z.string(),
  platform: z.enum(["tiktok", "instagram_reels", "youtube_shorts"]),
  video_path: z.string(),
  caption: z.string().min(10).max(2200),
  title_options: z.array(z.string().min(3).max(140)).min(1).max(5),
  hashtags: z.array(z.string().regex(/^#?[A-Za-z0-9_]+$/)).min(2).max(15),
  scheduled_at: z.string().datetime().optional(),
  status: z.enum(["draft", "ready", "posted", "failed"]),
});
```

- [ ] **Step 7: Write `packages/core/src/paths.ts`**

```ts
import path from "node:path";

const varDir = process.env.RCF_VAR_DIR ?? path.resolve(process.cwd(), "var");

export const paths = {
  root: varDir,
  storiesDir: () => path.join(varDir, "artifacts", "stories"),
  scoresDir: () => path.join(varDir, "artifacts", "scores"),
  renderDir: () => path.join(varDir, "artifacts", "render"),
  bundlesDir: () => path.join(varDir, "artifacts", "bundles"),
  logsDir: () => path.join(varDir, "logs"),
  storyJson: (id: string) => path.join(varDir, "artifacts", "stories", `${id}.json`),
  scoreJson: (id: string) => path.join(varDir, "artifacts", "scores", `${id}.json`),
  renderJson: (id: string) => path.join(varDir, "artifacts", "render", `${id}.json`),
  bundleDir: (id: string) => path.join(varDir, "artifacts", "bundles", id),
};
```

- [ ] **Step 8: Write `packages/core/src/ids.ts`**

```ts
import { randomBytes } from "node:crypto";

export const newStoryId = (): string => {
  const ts = Date.now().toString(36);
  const rand = randomBytes(4).toString("hex");
  return `s_${ts}_${rand}`;
};

export const newBatchId = (): string => {
  const ts = Date.now().toString(36);
  const rand = randomBytes(3).toString("hex");
  return `b_${ts}_${rand}`;
};
```

- [ ] **Step 9: Write `packages/core/src/index.ts`**

```ts
export * from "./schemas/story.js";
export * from "./schemas/score.js";
export * from "./schemas/render.js";
export * from "./schemas/bundle.js";
export * from "./paths.js";
export * from "./ids.js";
```

- [ ] **Step 10: Write `packages/core/tests/schemas.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  StoryPackageSchema,
  ForumCardSchema,
  ScoreReportSchema,
  RenderPackageSchema,
  PublishBundleSchema,
} from "../src/index.js";

const baseStory = {
  story_id: "s_test0001",
  created_at: new Date().toISOString(),
  premise: "A late-night confession from a building superintendent.",
  hook: "I should not have opened the basement door that night.",
  forum_card: {
    display_title: "Confession: I opened the wrong door",
    fictional_handle: "throwaway_nightshift_42",
    fictional_community_label: "confessions",
    relative_time_label: "2 hours ago",
    style_variant: "dark-card",
  },
  confession_voice: "first-person",
  story_blocks: [
    { index: 0, text: "It was the third night in a row the basement light flickered.", suggested_duration_s: 6 },
    { index: 1, text: "I told myself it was just a bulb.", suggested_duration_s: 4 },
  ],
  twist: "There was no bulb. The light had been coming up the stairs.",
  ending_mode: "twist",
  tone: "unsettling",
  intensity: "medium",
  background_mood: "dark-hallway",
  music_mood: "low-tension",
  tts_voice: "am_michael",
  cta: "comment-your-take",
  platform_variants: {
    tiktok_reels: { pacing: "fast" },
    youtube_shorts: { pacing: "medium" },
  },
  generation_prompt_version: "v1",
  freshness_fingerprint: "0123456789abcdef",
};

describe("StoryPackageSchema", () => {
  it("accepts a valid story", () => {
    expect(() => StoryPackageSchema.parse(baseStory)).not.toThrow();
  });
  it("rejects a too-long hook", () => {
    const bad = { ...baseStory, hook: "x".repeat(300) };
    expect(() => StoryPackageSchema.parse(bad)).toThrow();
  });
});

describe("ScoreReportSchema", () => {
  it("requires accept_decision", () => {
    const bad = { story_id: "s_test0001", heuristic_checks: [], heuristic_pass: true, reject_reasons: [] };
    expect(() => ScoreReportSchema.parse(bad)).toThrow();
  });
});

describe("RenderPackageSchema", () => {
  it("accepts a minimal package", () => {
    const pkg = {
      story_id: "s_test0001",
      scene_plan: { scenes: [] },
      timing_map: {},
      background_assets: [],
      audio_assets: [],
      render_targets: [{ platform: "tiktok_reels", out_path: "out.mp4" }],
    };
    expect(() => RenderPackageSchema.parse(pkg)).not.toThrow();
  });
});

describe("PublishBundleSchema", () => {
  it("rejects too few hashtags", () => {
    const bad = {
      story_id: "s_test0001",
      platform: "tiktok",
      video_path: "out.mp4",
      caption: "long enough caption for sure",
      title_options: ["Title"],
      hashtags: ["#one"],
      status: "draft",
    };
    expect(() => PublishBundleSchema.parse(bad)).toThrow();
  });
});
```

- [ ] **Step 11: Install and run tests**

Run:
```bash
pnpm --filter @rcf/core install
pnpm --filter @rcf/core test
```
Expected: all 4 tests pass.

- [ ] **Step 12: Commit**

```bash
git add packages/core
git commit -m "feat(core): shared zod schemas, paths, ids"
```
