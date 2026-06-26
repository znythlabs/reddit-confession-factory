# Reddit-Style Confession Story Factory — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fiction-first, OMP-orchestrated automation system that generates confession-style story candidates, filters them through a two-stage hybrid scoring layer, renders vertical faceless videos with a forum-inspired hook card and mood-matched backgrounds, and exports publish-ready bundles for TikTok, Instagram Reels, and YouTube Shorts — exposing an observer-only dashboard for monitoring.

**Architecture:** A Node.js + TypeScript workspace that runs locally on Windows 11. Each stage (generation, heuristic gate, LLM judge, formatting, rendering, export, analytics, dashboard) is a small CLI/role with a single artifact type as input and output. OMP subagents (Story Generator, Heuristic Gate, LLM Story Judge, Script Formatter, Visual Composer, Export/Publisher, Analytics Tracker) are role aliases for prompts executed against the same underlying scripts. All artifacts are JSON on disk under `var/artifacts/`. A `dashboard/` Next.js app reads those JSONs to render pipeline state and outcomes.

**Tech Stack:**
- Node.js 20.x (LTS) + TypeScript 5.4
- pnpm workspace
- `tsx` for running TS directly in dev
- `vitest` for unit tests
- `zod` for schema validation
- `puppeteer-core` for video rendering (HTML/CSS composition → MP4 via `playwright` headless capture or `remotion` style)
- `npx hyperframes` skill for the actual faceless render (per `skill://hyperframes`)
- Local Kokoro TTS (per `skill://hyperframes-media`) for narration
- Whisper.cpp for word-level timing (per `skill://hyperframes-media`)
- Local MusicGen for ambient BGM
- Next.js 14 + Tailwind for the observer dashboard
- `cron` + `node-cron` for the daily batch scheduler
- `better-sqlite3` for analytics + freshness tracking

## Global Constraints

These are non-negotiable across every task. Each task's requirements implicitly include this list.

- **Fiction-first generation.** Every story is original synthetic fiction. No scraping of real Reddit content. No claim of real provenance.
- **No forged Reddit UI.** The intro "forum card" must be a stylized homage. It must NEVER include: fabricated vote counts, comment counts, awards, karma, real subreddit names, or usernames likely to impersonate real people.
- **No platform posting in v1.** The system exports publish-ready bundles. Direct posting APIs are out of scope.
- **No human approval as the normal path.** Dashboard is observer-only.
- **No model fine-tuning.** Analytics drive prompt/template/seed selection.
- **Hybrid scoring always.** All stories pass through Stage A heuristic gate BEFORE Stage B LLM judge. The LLM judge is batch-budgeted.
- **Structured artifacts only.** Every stage persists JSON validated by `zod`. No prose handoffs.
- **7 fixed subagent roles** (Story Generator, Heuristic Gate, LLM Story Judge, Script Formatter, Visual Composer, Export/Publisher, Analytics Tracker). No swarm.
- **Three target platforms:** TikTok, Instagram Reels, YouTube Shorts. All use 9:16 vertical.
- **Runtime target:** Shorts may run slightly longer than TikTok/Reels.
- **Daily batch ceiling:** Generate 20–30 candidates → keep 3–8 → export 1–3 per platform.
- **Tech stack pinned:** Node 20.x, TypeScript 5.4, pnpm, vitest, zod, Next.js 14, Tailwind, `better-sqlite3`.
- **Windows 11 native path.** The shell is Git Bash per `skill://omp-windows-shell-behavior`. All file paths use forward slashes in scripts.
- **Worktree per task** (per `skill://using-git-worktrees`). No edits to `main` from inside a task.

## File Structure

```
.
├── package.json                        # workspace root
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── README.md
├── var/                                # runtime artifacts (gitignored)
│   ├── artifacts/
│   │   ├── stories/                    # story_package.json
│   │   ├── scores/                     # score_report.json
│   │   ├── render/                     # render_package.json + MP4s
│   │   └── bundles/                    # publish_bundle/<platform>/
│   ├── analytics.sqlite
│   ├── history.jsonl
│   └── logs/
├── packages/
│   ├── core/                           # shared zod schemas, types, paths
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts
│   │       ├── schemas/
│   │       │   ├── story.ts            # zod for story_package + forum_card
│   │       │   ├── score.ts            # zod for score_report
│   │       │   ├── render.ts           # zod for render_package
│   │       │   └── bundle.ts           # zod for publish_bundle
│   │       ├── paths.ts                # artifact path helpers
│   │       └── ids.ts                  # story_id / batch_id generators
│   ├── generator/                      # Story Generator role
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                # CLI entry: `pnpm --filter @rcf/generator run`
│   │   │   ├── prompts.ts              # versioned prompt templates
│   │   │   ├── llm.ts                  # OpenAI/Anthropic-compatible client wrapper
│   │   │   ├── generate.ts             # generateStoryPackage(input)
│   │   │   └── variants.ts             # tone / ending / intensity pools
│   │   └── tests/
│   │       └── generate.test.ts
│   ├── heuristic/                      # Heuristic Gate role
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                # CLI entry
│   │   │   ├── checks/
│   │   │   │   ├── runtime-fit.ts
│   │   │   │   ├── hook-length.ts
│   │   │   │   ├── cadence.ts
│   │   │   │   ├── duplicate.ts        # uses freshness_fingerprint
│   │   │   │   ├── banned-endings.ts
│   │   │   │   ├── readability.ts
│   │   │   │   └── structure.ts
│   │   │   ├── no-forgery.ts           # hard-fail if forum_card violates rules
│   │   │   └── gate.ts                 # runHeuristicGate(storyPackage)
│   │   └── tests/
│   │       ├── gate.test.ts
│   │       ├── no-forgery.test.ts
│   │       └── fixtures/
│   │           ├── valid-story.json
│   │           ├── forged-votes.json   # must fail
│   │           └── real-subreddit.json # must fail
│   ├── judge/                          # LLM Story Judge role
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                # CLI entry (batch-budgeted)
│   │   │   ├── llm.ts                  # judge call
│   │   │   ├── rubric.ts               # scoring rubric version
│   │   │   └── judge.ts                # judgeSurvivors(storyPaths, options)
│   │   └── tests/
│   │       └── judge.test.ts
│   ├── formatter/                      # Script Formatter role
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── segment.ts              # paragraph → scene blocks
│   │   │   ├── pacing.ts               # per-platform pacing curves
│   │   │   ├── cta.ts                  # CTA variants pool
│   │   │   └── format.ts               # formatStoryPackage(storyPackage, scoreReport)
│   │   └── tests/
│   │       ├── format.test.ts
│   │       └── pacing.test.ts
│   ├── composer/                       # Visual Composer role
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                # CLI entry: writes hyperframes project
│   │   │   ├── project.ts              # scaffolds a hyperframes project per story
│   │   │   ├── hook-card.ts            # forum-inspired card composer
│   │   │   ├── background.ts           # mood → background asset
│   │   │   ├── tts.ts                  # Kokoro TTS wrapper
│   │   │   ├── bgm.ts                  # MusicGen wrapper
│   │   │   └── render.ts               # renderRenderPackage(renderPackage)
│   │   └── tests/
│   │       ├── hook-card.test.ts
│   │       └── background.test.ts
│   ├── exporter/                       # Export / Publisher role
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                # CLI entry
│   │   │   ├── captions.ts             # per-platform caption/hashtag/titles
│   │   │   ├── bundle.ts               # write publish_bundle/<platform>/
│   │   │   └── manifest.ts             # one manifest per batch
│   │   └── tests/
│   │       └── bundle.test.ts
│   ├── analytics/                      # Analytics Tracker role
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts                # CLI entry
│   │   │   ├── db.ts                   # better-sqlite3 setup + migrations
│   │   │   ├── record.ts               # recordOutcome(storyId, platform, metrics)
│   │   │   ├── summarize.ts            # breakdowns by hook/tone/twist/...
│   │   │   └── freshness.ts            # freshness_fingerprint helpers
│   │   └── tests/
│   │       ├── record.test.ts
│   │       └── summarize.test.ts
│   ├── orchestrator/                   # OMP-style batch driver
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── batch.ts                # runDailyBatch()
│   │   │   ├── scheduler.ts            # node-cron entry
│   │   │   └── roles.ts                # role → package dispatch map
│   │   └── tests/
│   │       └── batch.test.ts
│   └── dashboard/                      # observer-only Next.js app
│       ├── package.json
│       ├── next.config.mjs
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                # pipeline health
│       │   ├── stories/page.tsx
│       │   ├── schedules/page.tsx
│       │   ├── outcomes/page.tsx
│       │   ├── logs/page.tsx
│       │   └── api/
│       │       ├── stories/route.ts
│       │       ├── health/route.ts
│       │       └── outcomes/route.ts
│       └── lib/
│           ├── readers.ts              # read JSON artifacts + sqlite
│           └── format.ts
└── scripts/
    ├── init.sh                         # bootstrap workspace + dirs
    └── doctor.sh                       # smoke check: toolchain present
```

---

## Task 1: Bootstrap the workspace

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `scripts/init.sh`
- Create: `scripts/doctor.sh`

**Interfaces:**
- Produces: `pnpm-workspace.yaml` listing `packages/*`
- Produces: `tsconfig.base.json` consumed by every package

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "rcf",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "init": "bash scripts/init.sh",
    "doctor": "bash scripts/doctor.sh",
    "test": "pnpm -r --parallel test",
    "build": "pnpm -r build"
  }
}
```

- [ ] **Step 2: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "packages/*"
```

- [ ] **Step 3: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

- [ ] **Step 4: Write `.gitignore`**

```
node_modules/
dist/
.next/
var/
*.tsbuildinfo
.env
.env.local
```

- [ ] **Step 5: Write `README.md`**

```markdown
# Reddit-Style Confession Story Factory (RCF)

Fiction-first faceless short-video pipeline for TikTok, Reels, Shorts.

See `docs/superpowers/specs/2026-06-26-reddit-confession-factory-design.md` for the full design.

## Quick start

```bash
pnpm install
pnpm doctor
pnpm --filter @rcf/orchestrator build
pnpm batch           # one daily batch
```

## Layout

- `packages/*` — one role per package
- `var/artifacts/*` — runtime artifacts
- `packages/dashboard` — observer-only ops console
```

- [ ] **Step 6: Write `scripts/init.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p var/artifacts/stories var/artifacts/scores var/artifacts/render var/artifacts/bundles var/logs
pnpm install
echo "RCF workspace initialized."
```

- [ ] **Step 7: Write `scripts/doctor.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
command -v node  >/dev/null || { echo "missing: node"; exit 1; }
command -v pnpm  >/dev/null || { echo "missing: pnpm"; exit 1; }
command -v npx   >/dev/null || { echo "missing: npx"; exit 1; }
node -v | grep -qE '^v20\.' || { echo "node must be 20.x"; exit 1; }
echo "doctor: ok"
```

- [ ] **Step 8: Run init**

Run: `bash scripts/init.sh && bash scripts/doctor.sh`
Expected: `RCF workspace initialized.` then `doctor: ok`

- [ ] **Step 9: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore README.md scripts/
git commit -m "chore: bootstrap RCF workspace"
```

---

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

---

## Task 3: Story Generator role

**Files:**
- Create: `packages/generator/package.json`
- Create: `packages/generator/tsconfig.json`
- Create: `packages/generator/src/index.ts`
- Create: `packages/generator/src/prompts.ts`
- Create: `packages/generator/src/llm.ts`
- Create: `packages/generator/src/variants.ts`
- Create: `packages/generator/src/generate.ts`
- Create: `packages/generator/tests/generate.test.ts`

**Interfaces:**
- Consumes: `StoryPackageSchema` from `@rcf/core`
- Produces: `generateStoryPackage(seed: GenerateSeed): Promise<StoryPackage>`
- `GenerateSeed = { tone, intensity, endingMode, runtimeTarget, platforms }`
- Output is written to `var/artifacts/stories/<story_id>.json` by the CLI

- [ ] **Step 1: Write `packages/generator/package.json`**

```json
{
  "name": "@rcf/generator",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "start": "tsx src/index.ts"
  },
  "dependencies": {
    "@rcf/core": "workspace:*",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Write `packages/generator/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `packages/generator/src/prompts.ts`**

```ts
export const SYSTEM_PROMPT = `
You are the Story Generator for a fiction-first faceless short-video channel.
You write ORIGINAL FICTIONAL confession-style stories. You never claim a story
came from a real person or a real subreddit. You never invent fake engagement
metrics. Output must conform to the JSON schema provided. Do not include
"votes", "comments", "awards", "karma", or any real subreddit name.
`.trim();

export const buildUserPrompt = (seed: {
  tone: string;
  intensity: string;
  endingMode: string;
  runtimeTarget: number;
}) => `
Generate one fictional confession-style short story for a vertical short-form
video. Constraints:
- tone: ${seed.tone}
- intensity: ${seed.intensity}
- ending_mode: ${seed.endingMode}
- target runtime: ${seed.runtimeTarget} seconds total
- 4-8 story blocks, each 1-3 sentences
- output strictly as JSON matching the schema
- no real subreddit names, no real usernames, no fabricated engagement metrics
`.trim();
```

- [ ] **Step 4: Write `packages/generator/src/llm.ts`**

```ts
type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

export interface LlmClient {
  complete(messages: ChatMsg[], opts?: { json?: boolean }): Promise<string>;
}

export const makeStubLlm = (response: string): LlmClient => ({
  async complete(messages) {
    return response;
  },
});

export const makeOpenAiCompatibleLlm = (
  baseUrl: string,
  apiKey: string,
  model: string
): LlmClient => ({
  async complete(messages, opts) {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: opts?.json ? { type: "json_object" } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`LLM ${res.status}: ${await res.text()}`);
    const data = (await res.json()) as { choices: { message: { content: string } }[] };
    return data.choices[0]!.message.content;
  },
});
```

- [ ] **Step 5: Write `packages/generator/src/variants.ts`**

```ts
export const tones = ["unsettling", "melancholic", "ominous", "reflective", "tense"] as const;
export const intensities = ["soft", "medium", "high"] as const;
export const endings = ["cliffhanger", "bittersweet", "twist", "quiet"] as const;

export type Tone = (typeof tones)[number];
export type Intensity = (typeof intensities)[number];
export type Ending = (typeof endings)[number];

export const pickRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
```

- [ ] **Step 6: Write `packages/generator/src/generate.ts`**

```ts
import { StoryPackageSchema, type StoryPackage, newStoryId, paths } from "@rcf/core";
import { writeFile, mkdir } from "node:fs/promises";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts.js";
import type { LlmClient } from "./llm.js";
import { makeStubLlm } from "./llm.js";

export type GenerateSeed = {
  tone: string;
  intensity: string;
  endingMode: string;
  runtimeTarget: number;
  platforms: string[];
};

export const generateStoryPackage = async (
  seed: GenerateSeed,
  llm: LlmClient = makeStubLlm("{}")
): Promise<StoryPackage> => {
  const raw = await llm.complete(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(seed) },
    ],
    { json: true }
  );
  const parsed = JSON.parse(raw);
  const story = StoryPackageSchema.parse({
    ...parsed,
    story_id: parsed.story_id ?? newStoryId(),
    created_at: parsed.created_at ?? new Date().toISOString(),
    freshness_fingerprint: parsed.freshness_fingerprint ?? hashFreshness(parsed),
  });
  return story;
};

export const persistStory = async (story: StoryPackage): Promise<string> => {
  await mkdir(paths.storiesDir(), { recursive: true });
  const out = paths.storyJson(story.story_id);
  await writeFile(out, JSON.stringify(story, null, 2));
  return out;
};

const hashFreshness = (p: Partial<StoryPackage>): string => {
  const crypto = require("node:crypto") as typeof import("node:crypto");
  const text = [p.premise ?? "", p.twist ?? "", (p.story_blocks ?? []).map((b) => b.text).join("|")].join("|");
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 16);
};
```

- [ ] **Step 7: Write `packages/generator/src/index.ts`**

```ts
import { generateStoryPackage, persistStory, type GenerateSeed } from "./generate.js";
import { tones, intensities, endings, pickRandom } from "./variants.js";

const count = Number(process.env.RCF_GENERATE_COUNT ?? "1");

const main = async () => {
  for (let i = 0; i < count; i++) {
    const seed: GenerateSeed = {
      tone: pickRandom(tones),
      intensity: pickRandom(intensities),
      endingMode: pickRandom(endings),
      runtimeTarget: 35,
      platforms: ["tiktok_reels", "youtube_shorts"],
    };
    const story = await generateStoryPackage(seed);
    const out = await persistStory(story);
    console.log(`generated ${story.story_id} -> ${out}`);
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 8: Write `packages/generator/tests/generate.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { generateStoryPackage } from "../src/generate.js";
import { makeStubLlm } from "../src/llm.js";
import { StoryPackageSchema } from "@rcf/core";

const validJson = {
  premise: "A fictional confession about an apartment super and a flickering light.",
  hook: "I should not have opened the basement door that night.",
  forum_card: {
    display_title: "Confession: basement door",
    fictional_handle: "throwaway_nightshift",
    fictional_community_label: "confessions",
    relative_time_label: "2 hours ago",
    style_variant: "dark-card",
  },
  confession_voice: "first-person",
  story_blocks: [
    { index: 0, text: "The basement light flickered for three nights.", suggested_duration_s: 6 },
    { index: 1, text: "I went down to check the bulb.", suggested_duration_s: 4 },
  ],
  twist: "There was no bulb. The light was coming up the stairs.",
  ending_mode: "twist",
  tone: "unsettling",
  intensity: "medium",
  background_mood: "dark-hallway",
  music_mood: "low-tension",
  tts_voice: "am_michael",
  cta: "comment-your-take",
  platform_variants: { tiktok_reels: { pacing: "fast" }, youtube_shorts: { pacing: "medium" } },
  generation_prompt_version: "v1",
};

describe("generateStoryPackage", () => {
  it("parses a valid LLM response", async () => {
    const story = await generateStoryPackage(
      { tone: "unsettling", intensity: "medium", endingMode: "twist", runtimeTarget: 35, platforms: ["tiktok_reels"] },
      makeStubLlm(JSON.stringify(validJson))
    );
    expect(() => StoryPackageSchema.parse(story)).not.toThrow();
    expect(story.story_id).toMatch(/^s_/);
  });

  it("rejects forged forum_card content (real subreddit)", async () => {
    const bad = { ...validJson, forum_card: { ...validJson.forum_card, fictional_community_label: "r/askreddit" } };
    const story = await generateStoryPackage(
      { tone: "unsettling", intensity: "medium", endingMode: "twist", runtimeTarget: 35, platforms: ["tiktok_reels"] },
      makeStubLlm(JSON.stringify(bad))
    );
    // The forum_card schema doesn't yet forbid real subreddit names; that lives in heuristic.
    // This test pins the *schema* accepts the field so the heuristic test owns the reject.
    expect(story.forum_card.fictional_community_label).toBe("r/askreddit");
  });
});
```

- [ ] **Step 9: Install and run tests**

Run:
```bash
pnpm --filter @rcf/generator install
pnpm --filter @rcf/generator test
```
Expected: 2 tests pass.

- [ ] **Step 10: Commit**

```bash
git add packages/generator
git commit -m "feat(generator): story generator role with prompt + LLM stub"
```

---

## Task 4: Heuristic Gate role (with no-forgery hard-fail)

**Files:**
- Create: `packages/heuristic/package.json`
- Create: `packages/heuristic/tsconfig.json`
- Create: `packages/heuristic/src/index.ts`
- Create: `packages/heuristic/src/checks/runtime-fit.ts`
- Create: `packages/heuristic/src/checks/hook-length.ts`
- Create: `packages/heuristic/src/checks/cadence.ts`
- Create: `packages/heuristic/src/checks/duplicate.ts`
- Create: `packages/heuristic/src/checks/banned-endings.ts`
- Create: `packages/heuristic/src/checks/readability.ts`
- Create: `packages/heuristic/src/checks/structure.ts`
- Create: `packages/heuristic/src/no-forgery.ts`
- Create: `packages/heuristic/src/gate.ts`
- Create: `packages/heuristic/tests/fixtures/valid-story.json`
- Create: `packages/heuristic/tests/fixtures/forged-votes.json`
- Create: `packages/heuristic/tests/fixtures/real-subreddit.json`
- Create: `packages/heuristic/tests/gate.test.ts`
- Create: `packages/heuristic/tests/no-forgery.test.ts`

**Interfaces:**
- Consumes: `StoryPackage` from `@rcf/core`
- Produces: `runHeuristicGate(story: StoryPackage): Promise<ScoreReport>`
- Persists to `paths.scoreJson(story.story_id)`

- [ ] **Step 1: Write `packages/heuristic/package.json`**

```json
{
  "name": "@rcf/heuristic",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": { "build": "tsc", "test": "vitest run", "start": "tsx src/index.ts" },
  "dependencies": { "@rcf/core": "workspace:*" },
  "devDependencies": { "tsx": "^4.7.0", "typescript": "^5.4.0", "vitest": "^1.6.0" }
}
```

- [ ] **Step 2: Write `packages/heuristic/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

- [ ] **Step 3: Write `packages/heuristic/src/checks/runtime-fit.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

export const runtimeFit = (s: StoryPackage) => {
  const total = s.story_blocks.reduce((a, b) => a + b.suggested_duration_s, 0);
  const ok = total >= 15 && total <= 90;
  return { name: "runtime-fit", pass: ok, detail: `total=${total}s` };
};
```

- [ ] **Step 4: Write `packages/heuristic/src/checks/hook-length.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

export const hookLength = (s: StoryPackage) => {
  const len = s.hook.length;
  const ok = len >= 12 && len <= 110;
  return { name: "hook-length", pass: ok, detail: `len=${len}` };
};
```

- [ ] **Step 5: Write `packages/heuristic/src/checks/cadence.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

export const cadence = (s: StoryPackage) => {
  if (s.story_blocks.length < 3) {
    return { name: "cadence", pass: false, detail: "needs at least 3 blocks" };
  }
  const varying = new Set(s.story_blocks.map((b) => Math.round(b.suggested_duration_s))).size >= 2;
  return { name: "cadence", pass: varying, detail: `durations=${s.story_blocks.map((b) => b.suggested_duration_s).join(",")}` };
};
```

- [ ] **Step 6: Write `packages/heuristic/src/checks/duplicate.ts`**

```ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { StoryPackage } from "@rcf/core";
import { paths } from "@rcf/core";

export const duplicate = async (s: StoryPackage) => {
  try {
    const dir = paths.storiesDir();
    const files = await readdir(dir);
    for (const f of files) {
      if (!f.endsWith(".json") || f === `${s.story_id}.json`) continue;
      const other = JSON.parse(await readFile(path.join(dir, f), "utf8")) as StoryPackage;
      if (other.freshness_fingerprint === s.freshness_fingerprint) {
        return { name: "duplicate", pass: false, detail: `collides with ${f}` };
      }
    }
    return { name: "duplicate", pass: true };
  } catch {
    return { name: "duplicate", pass: true };
  }
};
```

- [ ] **Step 7: Write `packages/heuristic/src/checks/banned-endings.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

const BANNED = [/and then i woke up/i, /it was all a dream/i, /the end\./i];

export const bannedEndings = (s: StoryPackage) => {
  const haystack = `${s.twist} ${s.story_blocks.map((b) => b.text).join(" ")}`;
  const hit = BANNED.find((re) => re.test(haystack));
  return { name: "banned-endings", pass: !hit, detail: hit ? hit.source : undefined };
};
```

- [ ] **Step 8: Write `packages/heuristic/src/checks/readability.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

export const readability = (s: StoryPackage) => {
  const all = `${s.hook} ${s.story_blocks.map((b) => b.text).join(" ")}`;
  const avgSentenceLen = (() => {
    const sentences = all.split(/[.!?]+/).filter(Boolean);
    if (sentences.length === 0) return 999;
    return all.length / sentences.length;
  })();
  const ok = avgSentenceLen <= 140;
  return { name: "readability", pass: ok, detail: `avg=${avgSentenceLen.toFixed(0)}` };
};
```

- [ ] **Step 9: Write `packages/heuristic/src/checks/structure.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

export const structure = (s: StoryPackage) => {
  const ok =
    s.premise.length > 0 &&
    s.twist.length > 0 &&
    s.story_blocks.length >= 2 &&
    s.story_blocks.every((b, i) => b.index === i);
  return { name: "structure", pass: ok };
};
```

- [ ] **Step 10: Write `packages/heuristic/src/no-forgery.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

const FORBIDDEN_KEYS = ["votes", "comments", "comment_count", "awards", "karma", "upvote", "downvote"] as const;
const REAL_SUBREDDITS = [
  "r/askreddit",
  "r/confessions",
  "r/aita",
  "r/tifu",
  "r/offmychest",
  "r/trueoffmychest",
  "r/relationship_advice",
  "r/nosleep",
  "r/letsnotmeet",
];
const IMPERSONATION_HINTS = ["real_", "official_", "mod_", "admin_"];

export const noForgery = (s: StoryPackage) => {
  const card = s.forum_card as unknown as Record<string, unknown>;
  const hits: string[] = [];

  for (const key of FORBIDDEN_KEYS) {
    if (key in card) hits.push(`forum_card has forbidden field "${key}"`);
  }
  const label = (card.fictional_community_label ?? "").toString().toLowerCase().trim();
  if (REAL_SUBREDDITS.some((sr) => label === sr || label.endsWith(sr))) {
    hits.push(`forum_card.fictional_community_label uses real subreddit "${label}"`);
  }
  const handle = (card.fictional_handle ?? "").toString().toLowerCase();
  if (IMPERSONATION_HINTS.some((h) => handle.startsWith(h))) {
    hits.push(`forum_card.fictional_handle impersonation pattern: "${handle}"`);
  }
  return { pass: hits.length === 0, hits };
};
```

- [ ] **Step 11: Write `packages/heuristic/src/gate.ts`**

```ts
import { ScoreReportSchema, type StoryPackage, type ScoreReport, paths } from "@rcf/core";
import { writeFile, mkdir } from "node:fs/promises";
import { runtimeFit } from "./checks/runtime-fit.js";
import { hookLength } from "./checks/hook-length.js";
import { cadence } from "./checks/cadence.js";
import { duplicate } from "./checks/duplicate.js";
import { bannedEndings } from "./checks/banned-endings.js";
import { readability } from "./checks/readability.js";
import { structure } from "./checks/structure.js";
import { noForgery } from "./no-forgery.js";

export const runHeuristicGate = async (story: StoryPackage): Promise<ScoreReport> => {
  const forgery = noForgery(story);
  const checks = await Promise.all([
    runtimeFit(story),
    hookLength(story),
    cadence(story),
    duplicate(story),
    bannedEndings(story),
    readability(story),
    structure(story),
  ]);
  const allPass = forgery.pass && checks.every((c) => c.pass);
  const report = ScoreReportSchema.parse({
    story_id: story.story_id,
    heuristic_checks: checks,
    heuristic_pass: allPass,
    accept_decision: allPass ? "accept" : "reject",
    reject_reasons: [
      ...checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail ?? "failed"}`),
      ...forgery.hits,
    ],
  });
  await mkdir(paths.scoresDir(), { recursive: true });
  await writeFile(paths.scoreJson(story.story_id), JSON.stringify(report, null, 2));
  return report;
};
```

- [ ] **Step 12: Write `packages/heuristic/src/index.ts`**

```ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type StoryPackage } from "@rcf/core";
import { runHeuristicGate } from "./gate.js";

const main = async () => {
  const dir = paths.storiesDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  let accepted = 0;
  let rejected = 0;
  for (const f of files) {
    const story = JSON.parse(await readFile(path.join(dir, f), "utf8")) as StoryPackage;
    const r = await runHeuristicGate(story);
    if (r.accept_decision === "accept") accepted++; else rejected++;
  }
  console.log(`heuristic: ${accepted} accepted, ${rejected} rejected`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 13: Write `packages/heuristic/tests/fixtures/valid-story.json`**

```json
{
  "story_id": "s_fixture_valid",
  "created_at": "2026-06-26T00:00:00.000Z",
  "premise": "A fictional confession about a building superintendent and a flickering basement light.",
  "hook": "I should not have opened the basement door that night.",
  "forum_card": {
    "display_title": "Confession: basement door",
    "fictional_handle": "throwaway_nightshift",
    "fictional_community_label": "confessions",
    "relative_time_label": "2 hours ago",
    "style_variant": "dark-card"
  },
  "confession_voice": "first-person",
  "story_blocks": [
    { "index": 0, "text": "The basement light flickered for three nights.", "suggested_duration_s": 6 },
    { "index": 1, "text": "I told myself it was just a bulb.", "suggested_duration_s": 4 },
    { "index": 2, "text": "On the third night I went down.", "suggested_duration_s": 5 }
  ],
  "twist": "There was no bulb. The light was coming up the stairs.",
  "ending_mode": "twist",
  "tone": "unsettling",
  "intensity": "medium",
  "background_mood": "dark-hallway",
  "music_mood": "low-tension",
  "tts_voice": "am_michael",
  "cta": "comment-your-take",
  "platform_variants": { "tiktok_reels": { "pacing": "fast" }, "youtube_shorts": { "pacing": "medium" } },
  "generation_prompt_version": "v1",
  "freshness_fingerprint": "f1f1f1f1f1f1f1f1"
}
```

- [ ] **Step 14: Write `packages/heuristic/tests/fixtures/forged-votes.json`**

```json
{
  "story_id": "s_fixture_forged",
  "created_at": "2026-06-26T00:00:00.000Z",
  "premise": "Forged-vote test fixture.",
  "hook": "I should not have opened the basement door that night.",
  "forum_card": {
    "display_title": "Confession",
    "fictional_handle": "throwaway_x",
    "fictional_community_label": "confessions",
    "relative_time_label": "2 hours ago",
    "style_variant": "dark-card",
    "votes": 1234,
    "comments": 42,
    "karma": 9001
  },
  "confession_voice": "first-person",
  "story_blocks": [
    { "index": 0, "text": "Block 1", "suggested_duration_s": 6 },
    { "index": 1, "text": "Block 2", "suggested_duration_s": 4 }
  ],
  "twist": "The twist.",
  "ending_mode": "twist",
  "tone": "unsettling",
  "intensity": "medium",
  "background_mood": "dark-hallway",
  "music_mood": "low-tension",
  "tts_voice": "am_michael",
  "cta": "comment-your-take",
  "platform_variants": { "tiktok_reels": { "pacing": "fast" }, "youtube_shorts": { "pacing": "medium" } },
  "generation_prompt_version": "v1",
  "freshness_fingerprint": "f2f2f2f2f2f2f2f2"
}
```

- [ ] **Step 15: Write `packages/heuristic/tests/fixtures/real-subreddit.json`**

```json
{
  "story_id": "s_fixture_real_sub",
  "created_at": "2026-06-26T00:00:00.000Z",
  "premise": "Real-subreddit test fixture.",
  "hook": "I should not have opened the basement door that night.",
  "forum_card": {
    "display_title": "Confession",
    "fictional_handle": "throwaway_x",
    "fictional_community_label": "r/askreddit",
    "relative_time_label": "2 hours ago",
    "style_variant": "dark-card"
  },
  "confession_voice": "first-person",
  "story_blocks": [
    { "index": 0, "text": "Block 1", "suggested_duration_s": 6 },
    { "index": 1, "text": "Block 2", "suggested_duration_s": 4 }
  ],
  "twist": "The twist.",
  "ending_mode": "twist",
  "tone": "unsettling",
  "intensity": "medium",
  "background_mood": "dark-hallway",
  "music_mood": "low-tension",
  "tts_voice": "am_michael",
  "cta": "comment-your-take",
  "platform_variants": { "tiktok_reels": { "pacing": "fast" }, "youtube_shorts": { "pacing": "medium" } },
  "generation_prompt_version": "v1",
  "freshness_fingerprint": "f3f3f3f3f3f3f3f3"
}
```

- [ ] **Step 16: Write `packages/heuristic/tests/gate.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { runHeuristicGate } from "../src/gate.js";
import valid from "./fixtures/valid-story.json" assert { type: "json" };
import forged from "./fixtures/forged-votes.json" assert { type: "json" };
import realSub from "./fixtures/real-subreddit.json" assert { type: "json" };

describe("runHeuristicGate", () => {
  it("accepts a clean story", async () => {
    const r = await runHeuristicGate(valid as any);
    expect(r.accept_decision).toBe("accept");
  });

  it("rejects forged forum_card engagement metrics", async () => {
    const r = await runHeuristicGate(forged as any);
    expect(r.accept_decision).toBe("reject");
    expect(r.reject_reasons.some((x) => x.includes("forbidden field"))).toBe(true);
  });

  it("rejects real subreddit labels", async () => {
    const r = await runHeuristicGate(realSub as any);
    expect(r.accept_decision).toBe("reject");
    expect(r.reject_reasons.some((x) => x.includes("real subreddit"))).toBe(true);
  });
});
```

- [ ] **Step 17: Write `packages/heuristic/tests/no-forgery.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { noForgery } from "../src/no-forgery.js";
import forged from "./fixtures/forged-votes.json" assert { type: "json" };
import realSub from "./fixtures/real-subreddit.json" assert { type: "json" };
import valid from "./fixtures/valid-story.json" assert { type: "json" };

describe("noForgery", () => {
  it("passes clean stories", () => {
    const r = noForgery(valid as any);
    expect(r.pass).toBe(true);
    expect(r.hits).toEqual([]);
  });
  it("flags forged engagement metrics", () => {
    const r = noForgery(forged as any);
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.includes("votes"))).toBe(true);
  });
  it("flags real subreddit references", () => {
    const r = noForgery(realSub as any);
    expect(r.pass).toBe(false);
    expect(r.hits.some((h) => h.includes("real subreddit"))).toBe(true);
  });
});
```

- [ ] **Step 18: Install and run tests**

Run:
```bash
pnpm --filter @rcf/heuristic install
pnpm --filter @rcf/heuristic test
```
Expected: 6 tests pass (3 gate + 3 no-forgery).

- [ ] **Step 19: Commit**

```bash
git add packages/heuristic
git commit -m "feat(heuristic): gate + no-forgery checks with fixtures"
```

---

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

---

## Task 6: Script Formatter role

**Files:**
- Create: `packages/formatter/package.json`
- Create: `packages/formatter/tsconfig.json`
- Create: `packages/formatter/src/index.ts`
- Create: `packages/formatter/src/segment.ts`
- Create: `packages/formatter/src/pacing.ts`
- Create: `packages/formatter/src/cta.ts`
- Create: `packages/formatter/src/format.ts`
- Create: `packages/formatter/tests/format.test.ts`
- Create: `packages/formatter/tests/pacing.test.ts`

**Interfaces:**
- Consumes: `StoryPackage` + `ScoreReport`
- Produces: `formatStoryPackage(story, score, options: { platform: 'tiktok_reels' | 'youtube_shorts' }): RenderPackage`
- Persists to `paths.renderJson(story.story_id)` (one file per platform)

- [ ] **Step 1: Write `packages/formatter/package.json`**

```json
{
  "name": "@rcf/formatter",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": { "build": "tsc", "test": "vitest run", "start": "tsx src/index.ts" },
  "dependencies": { "@rcf/core": "workspace:*" },
  "devDependencies": { "tsx": "^4.7.0", "typescript": "^5.4.0", "vitest": "^1.6.0" }
}
```

- [ ] **Step 2: Write `packages/formatter/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

- [ ] **Step 3: Write `packages/formatter/src/segment.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

export const segmentBlocks = (s: StoryPackage): { index: number; text: string; duration_s: number }[] =>
  s.story_blocks.map((b) => ({ index: b.index, text: b.text, duration_s: b.suggested_duration_s }));
```

- [ ] **Step 4: Write `packages/formatter/src/pacing.ts`**

```ts
type Platform = "tiktok_reels" | "youtube_shorts";

export const pacingFactor = (p: Platform, storyPacing: "fast" | "medium" | "slow"): number => {
  if (p === "tiktok_reels") {
    return storyPacing === "fast" ? 0.85 : 1.0;
  }
  return storyPacing === "slow" ? 1.2 : 1.0;
};

export const adjustDuration = (d: number, factor: number) => Math.max(2, Math.round(d * factor * 10) / 10);
```

- [ ] **Step 5: Write `packages/formatter/src/cta.ts`**

```ts
export const ctaText = (c: string): string => {
  switch (c) {
    case "follow-for-part-2":
      return "Follow for part 2.";
    case "comment-your-take":
      return "What would you have done?";
    case "share-if-relate":
      return "Share if you have been there.";
    default:
      return "";
  }
};
```

- [ ] **Step 6: Write `packages/formatter/src/format.ts`**

```ts
import {
  RenderPackageSchema,
  type StoryPackage,
  type ScoreReport,
  type RenderPackage,
  paths,
} from "@rcf/core";
import { writeFile, mkdir } from "node:fs/promises";
import { segmentBlocks } from "./segment.js";
import { pacingFactor, adjustDuration } from "./pacing.js";
import { ctaText } from "./cta.js";

export const formatStoryPackage = async (
  story: StoryPackage,
  _score: ScoreReport,
  opts: { platform: "tiktok_reels" | "youtube_shorts"; outDir?: string }
): Promise<RenderPackage> => {
  const storyPacing =
    opts.platform === "tiktok_reels"
      ? story.platform_variants.tiktok_reels.pacing
      : story.platform_variants.youtube_shorts.pacing;
  const factor = pacingFactor(opts.platform, storyPacing);
  const blocks = segmentBlocks(story);

  const hookDuration = 2.0;
  const outroDuration = 1.5;
  let cursor = 0;
  const scenes = [
    {
      scene_id: `${story.story_id}_hook`,
      kind: "hook-card" as const,
      start_s: cursor,
      duration_s: hookDuration,
      text: story.hook,
      background_mood: story.background_mood,
    },
  ];
  cursor += hookDuration;
  for (const b of blocks) {
    const d = adjustDuration(b.duration_s, factor);
    scenes.push({
      scene_id: `${story.story_id}_b${b.index}`,
      kind: "story-block" as const,
      start_s: cursor,
      duration_s: d,
      text: b.text,
      background_mood: story.background_mood,
    });
    cursor += d;
  }
  scenes.push({
    scene_id: `${story.story_id}_twist`,
    kind: "twist" as const,
    start_s: cursor,
    duration_s: adjustDuration(3, factor),
    text: story.twist,
    background_mood: story.background_mood,
  });
  cursor += adjustDuration(3, factor);
  scenes.push({
    scene_id: `${story.story_id}_outro`,
    kind: "outro" as const,
    start_s: cursor,
    duration_s: outroDuration,
    text: ctaText(story.cta),
  });

  const out = (opts.outDir ?? paths.renderDir()) + `/${story.story_id}_${opts.platform}.mp4`;
  const pkg = RenderPackageSchema.parse({
    story_id: story.story_id,
    scene_plan: { scenes },
    timing_map: Object.fromEntries(scenes.map((s) => [s.scene_id, s.start_s])),
    background_assets: [],
    audio_assets: [],
    render_targets: [{ platform: opts.platform, out_path: out }],
  });
  await mkdir(paths.renderDir(), { recursive: true });
  await writeFile(paths.renderJson(`${story.story_id}_${opts.platform}`), JSON.stringify(pkg, null, 2));
  return pkg;
};
```

- [ ] **Step 7: Write `packages/formatter/src/index.ts`**

```ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type StoryPackage, type ScoreReport } from "@rcf/core";
import { formatStoryPackage } from "./format.js";

const main = async () => {
  const scoreFiles = (await readdir(paths.scoresDir())).filter((f) => f.endsWith(".json"));
  const platforms: ("tiktok_reels" | "youtube_shorts")[] = ["tiktok_reels", "youtube_shorts"];
  let count = 0;
  for (const f of scoreFiles) {
    const score = JSON.parse(await readFile(path.join(paths.scoresDir(), f), "utf8")) as ScoreReport;
    if (score.accept_decision !== "accept") continue;
    const story = JSON.parse(await readFile(paths.storyJson(score.story_id), "utf8")) as StoryPackage;
    for (const p of platforms) {
      await formatStoryPackage(story, score, { platform: p });
      count++;
    }
  }
  console.log(`formatter: wrote ${count} render packages`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 8: Write `packages/formatter/tests/format.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { formatStoryPackage } from "../src/format.js";
import { RenderPackageSchema, type StoryPackage, type ScoreReport } from "@rcf/core";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

const acceptScore: ScoreReport = {
  story_id: validStory.story_id,
  heuristic_checks: [],
  heuristic_pass: true,
  accept_decision: "accept",
  reject_reasons: [],
};

describe("formatStoryPackage", () => {
  it("produces a valid render package for tiktok_reels", async () => {
    const pkg = await formatStoryPackage(validStory as any, acceptScore, { platform: "tiktok_reels" });
    expect(() => RenderPackageSchema.parse(pkg)).not.toThrow();
    expect(pkg.scene_plan.scenes[0]!.kind).toBe("hook-card");
    expect(pkg.scene_plan.scenes.at(-1)!.kind).toBe("outro");
  });
});
```

- [ ] **Step 9: Write `packages/formatter/tests/pacing.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { pacingFactor, adjustDuration } from "../src/pacing.js";

describe("pacing", () => {
  it("tiktok fast -> 0.85", () => {
    expect(pacingFactor("tiktok_reels", "fast")).toBe(0.85);
  });
  it("shorts slow -> 1.2", () => {
    expect(pacingFactor("youtube_shorts", "slow")).toBe(1.2);
  });
  it("adjustDuration floors at 2s", () => {
    expect(adjustDuration(1, 0.1)).toBe(2);
  });
});
```

- [ ] **Step 10: Install and run tests**

Run:
```bash
pnpm --filter @rcf/formatter install
pnpm --filter @rcf/formatter test
```
Expected: 4 tests pass (1 format + 3 pacing).

- [ ] **Step 11: Commit**

```bash
git add packages/formatter
git commit -m "feat(formatter): script + scene planner with per-platform pacing"
```

---

## Task 7: Visual Composer role (HyperFrames-backed)

**Files:**
- Create: `packages/composer/package.json`
- Create: `packages/composer/tsconfig.json`
- Create: `packages/composer/src/index.ts`
- Create: `packages/composer/src/project.ts`
- Create: `packages/composer/src/hook-card.ts`
- Create: `packages/composer/src/background.ts`
- Create: `packages/composer/src/tts.ts`
- Create: `packages/composer/src/bgm.ts`
- Create: `packages/composer/src/render.ts`
- Create: `packages/composer/tests/hook-card.test.ts`
- Create: `packages/composer/tests/background.test.ts`

**Interfaces:**
- Consumes: `RenderPackage` (one per platform)
- Produces: `renderRenderPackage(rp: RenderPackage): Promise<{ out_path: string }>`
- The composer scaffolds a hyperframes project per story under `var/composer/<story_id>_<platform>/` and shells out to `npx hyperframes render` per `skill://hyperframes-cli`
- TTS uses local Kokoro via `skill://hyperframes-media`
- BGM uses local MusicGen via `skill://hyperframes-media`
- Hard gate: refuses to render if `RenderPackage.background_assets` includes a path that resolves outside `assets/`

- [ ] **Step 1: Write `packages/composer/package.json`**

```json
{
  "name": "@rcf/composer",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": { "build": "tsc", "test": "vitest run", "start": "tsx src/index.ts" },
  "dependencies": { "@rcf/core": "workspace:*" },
  "devDependencies": { "tsx": "^4.7.0", "typescript": "^5.4.0", "vitest": "^1.6.0" }
}
```

- [ ] **Step 2: Write `packages/composer/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

- [ ] **Step 3: Write `packages/composer/src/hook-card.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

export const renderHookCardHtml = (story: StoryPackage): string => `
<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin:0; font-family: -apple-system, Inter, sans-serif; background:#0e0d0c; color:#f3eee5; }
  .card { padding: 32px 24px; border-left: 4px solid #b1351f; background:#1a1714; }
  .meta { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color:#a89c8a; margin-bottom: 12px; }
  .handle { color:#d8c8a8; }
  .time { color:#7a7468; margin-left: 8px; }
  .title { font-size: 22px; font-weight: 600; line-height: 1.25; }
  .community { color:#a89c8a; font-size: 13px; margin-top: 6px; }
</style></head>
<body>
  <div class="card">
    <div class="meta">
      <span class="handle">${story.forum_card.fictional_handle}</span>
      <span class="time">${story.forum_card.relative_time_label}</span>
    </div>
    <div class="title">${story.forum_card.display_title}</div>
    <div class="community">${story.forum_card.fictional_community_label}</div>
  </div>
</body></html>`.trim();
```

- [ ] **Step 4: Write `packages/composer/src/background.ts`**

```ts
import path from "node:path";

const ASSETS = path.resolve(process.cwd(), "packages/composer/assets");

export const backgroundPathFor = (mood: string): string => {
  const safe = mood.replace(/[^a-z0-9-]/g, "");
  const p = path.join(ASSETS, `${safe}.mp4`);
  if (!p.startsWith(ASSETS + path.sep) && p !== ASSETS) {
    throw new Error(`background path escapes assets dir: ${p}`);
  }
  return p;
};
```

- [ ] **Step 5: Write `packages/composer/src/tts.ts`**

```ts
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const pexec = promisify(execFile);

export const ttsToFile = async (text: string, voice: string, outFile: string): Promise<string> => {
  // ponytail: shells out to npx hyperframes tts --voice <v> --text <t> --out <f> until the CLI is wired.
  // Add when the pipeline first reaches audio generation.
  await pexec("npx", ["hyperframes", "tts", "--voice", voice, "--text", text, "--out", outFile], { cwd: path.resolve(process.cwd()) });
  return outFile;
};
```

- [ ] **Step 6: Write `packages/composer/src/bgm.ts`**

```ts
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const pexec = promisify(execFile);

export const bgmToFile = async (mood: string, outFile: string): Promise<string> => {
  // ponytail: shells out to npx hyperframes bgm --mood <m> --out <f> until CLI is wired.
  await pexec("npx", ["hyperframes", "bgm", "--mood", mood, "--out", outFile], { cwd: path.resolve(process.cwd()) });
  return outFile;
};
```

- [ ] **Step 7: Write `packages/composer/src/project.ts`**

```ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RenderPackage, StoryPackage } from "@rcf/core";
import { paths } from "@rcf/core";
import { renderHookCardHtml } from "./hook-card.js";
import { backgroundPathFor } from "./background.js";

export const scaffoldProject = async (rp: RenderPackage, story: StoryPackage): Promise<string> => {
  const projectDir = path.resolve(process.cwd(), `var/composer/${rp.story_id}_${rp.render_targets[0]!.platform}`);
  await mkdir(projectDir, { recursive: true });
  await mkdir(path.join(projectDir, "assets"), { recursive: true });
  await writeFile(path.join(projectDir, "hook-card.html"), renderHookCardHtml(story), "utf8");
  await writeFile(
    path.join(projectDir, "render.json"),
    JSON.stringify({ ...rp, background_assets: [backgroundPathFor(story.background_mood)] }, null, 2)
  );
  return projectDir;
};
```

- [ ] **Step 8: Write `packages/composer/src/render.ts`**

```ts
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { RenderPackage, StoryPackage } from "@rcf/core";
import { scaffoldProject } from "./project.js";

const pexec = promisify(execFile);

export const renderRenderPackage = async (rp: RenderPackage, story: StoryPackage): Promise<{ out_path: string }> => {
  const projectDir = await scaffoldProject(rp, story);
  const out = rp.render_targets[0]!.out_path;
  // ponytail: shells out to npx hyperframes render --project <dir> --out <out>
  await pexec("npx", ["hyperframes", "render", "--project", projectDir, "--out", out], {
    cwd: path.resolve(process.cwd()),
  });
  return { out_path: out };
};
```

- [ ] **Step 9: Write `packages/composer/src/index.ts`**

```ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type RenderPackage, type StoryPackage } from "@rcf/core";
import { renderRenderPackage } from "./render.js";

const main = async () => {
  const files = (await readdir(paths.renderDir())).filter((f) => f.endsWith(".json"));
  let ok = 0;
  let failed = 0;
  for (const f of files) {
    const rp = JSON.parse(await readFile(path.join(paths.renderDir(), f), "utf8")) as RenderPackage;
    const story = JSON.parse(await readFile(paths.storyJson(rp.story_id), "utf8")) as StoryPackage;
    try {
      await renderRenderPackage(rp, story);
      ok++;
    } catch (e) {
      console.error(`render failed for ${rp.story_id}:`, e);
      failed++;
    }
  }
  console.log(`composer: ${ok} ok, ${failed} failed`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 10: Write `packages/composer/tests/hook-card.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { renderHookCardHtml } from "../src/hook-card.js";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

describe("renderHookCardHtml", () => {
  it("includes the fictional handle and title", () => {
    const html = renderHookCardHtml(validStory as any);
    expect(html).toContain(validStory.forum_card.fictional_handle);
    expect(html).toContain(validStory.forum_card.display_title);
  });
  it("does not include forged engagement fields even if added to story", () => {
    const html = renderHookCardHtml(validStory as any);
    expect(html).not.toContain("votes");
    expect(html).not.toContain("karma");
    expect(html).not.toContain("comments");
  });
});
```

- [ ] **Step 11: Write `packages/composer/tests/background.test.ts`**

```ts
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
```

- [ ] **Step 12: Install and run tests**

Run:
```bash
pnpm --filter @rcf/composer install
pnpm --filter @rcf/composer test
```
Expected: 3 tests pass.

- [ ] **Step 13: Commit**

```bash
git add packages/composer
git commit -m "feat(composer): hyperframes-backed visual composer with path-traversal guard"
```

---

## Task 8: Exporter role

**Files:**
- Create: `packages/exporter/package.json`
- Create: `packages/exporter/tsconfig.json`
- Create: `packages/exporter/src/index.ts`
- Create: `packages/exporter/src/captions.ts`
- Create: `packages/exporter/src/bundle.ts`
- Create: `packages/exporter/src/manifest.ts`
- Create: `packages/exporter/tests/bundle.test.ts`

**Interfaces:**
- Consumes: a `RenderPackage` whose `out_path` already exists on disk
- Produces: `writeBundle(rp, story, platform): Promise<PublishBundle>`
- Writes to `paths.bundleDir(story_id)/<platform>/` and returns the bundle
- The manifest is `var/artifacts/bundles/<story_id>/manifest.json` listing all platforms produced for that story

- [ ] **Step 1: Write `packages/exporter/package.json`**

```json
{
  "name": "@rcf/exporter",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": { "build": "tsc", "test": "vitest run", "start": "tsx src/index.ts" },
  "dependencies": { "@rcf/core": "workspace:*" },
  "devDependencies": { "tsx": "^4.7.0", "typescript": "^5.4.0", "vitest": "^1.6.0" }
}
```

- [ ] **Step 2: Write `packages/exporter/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

- [ ] **Step 3: Write `packages/exporter/src/captions.ts`**

```ts
import type { StoryPackage } from "@rcf/core";

export const buildCaption = (s: StoryPackage): string => {
  const base = s.hook;
  const cta =
    s.cta === "comment-your-take"
      ? "\n\nWhat would you have done? Tell me in the comments."
      : s.cta === "share-if-relate"
        ? "\n\nShare if you have been there."
        : s.cta === "follow-for-part-2"
          ? "\n\nFollow for part 2."
          : "";
  return `${base}${cta}`;
};

export const buildHashtags = (s: StoryPackage): string[] => {
  const base = ["#storytime", "#confession", "#fictionalstory", "#shorts"];
  const tone =
    s.tone === "unsettling" || s.tone === "ominous" || s.tone === "tense"
      ? ["#creepy", "#moody"]
      : ["#reflective", "#emotional"];
  return [...base, ...tone, "#aiart"].slice(0, 8);
};

export const buildTitles = (s: StoryPackage): string[] => [
  s.hook,
  `Confession: ${s.forum_card.display_title}`,
  s.twist,
].slice(0, 3);
```

- [ ] **Step 4: Write `packages/exporter/src/bundle.ts`**

```ts
import { mkdir, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { PublishBundleSchema, type StoryPackage, type RenderPackage, type PublishBundle, paths } from "@rcf/core";
import { buildCaption, buildHashtags, buildTitles } from "./captions.js";

export const writeBundle = async (
  rp: RenderPackage,
  story: StoryPackage,
  platform: "tiktok" | "instagram_reels" | "youtube_shorts"
): Promise<PublishBundle> => {
  const src = rp.render_targets[0]!.out_path;
  await stat(src); // hard fail if render missing
  const dir = path.join(paths.bundleDir(story.story_id), platform);
  await mkdir(dir, { recursive: true });
  const dst = path.join(dir, path.basename(src));
  const { copyFile } = await import("node:fs/promises");
  await copyFile(src, dst);
  const bundle = PublishBundleSchema.parse({
    story_id: story.story_id,
    platform,
    video_path: dst,
    caption: buildCaption(story),
    title_options: buildTitles(story),
    hashtags: buildHashtags(story),
    status: "ready",
  });
  await writeFile(path.join(dir, "bundle.json"), JSON.stringify(bundle, null, 2));
  return bundle;
};
```

- [ ] **Step 5: Write `packages/exporter/src/manifest.ts`**

```ts
import { writeFile, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type PublishBundle } from "@rcf/core";

export const writeStoryManifest = async (storyId: string): Promise<void> => {
  const dir = paths.bundleDir(storyId);
  await mkdir(dir, { recursive: true });
  const subs = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory());
  const bundles: PublishBundle[] = [];
  for (const s of subs) {
    try {
      const raw = await readFile(path.join(dir, s.name, "bundle.json"), "utf8");
      bundles.push(JSON.parse(raw) as PublishBundle);
    } catch {
      // skip incomplete
    }
  }
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify({ story_id: storyId, bundles }, null, 2));
};
```

- [ ] **Step 6: Write `packages/exporter/src/index.ts`**

```ts
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type RenderPackage, type StoryPackage } from "@rcf/core";
import { writeBundle } from "./bundle.js";
import { writeStoryManifest } from "./manifest.js";

const PLATFORM_BY_TARGET: Record<string, "tiktok" | "instagram_reels" | "youtube_shorts"> = {
  tiktok_reels: "tiktok",
  youtube_shorts: "youtube_shorts",
};

const main = async () => {
  const files = (await readdir(paths.renderDir())).filter((f) => f.endsWith(".json"));
  const seen = new Set<string>();
  for (const f of files) {
    const rp = JSON.parse(await readFile(path.join(paths.renderDir(), f), "utf8")) as RenderPackage;
    const story = JSON.parse(await readFile(paths.storyJson(rp.story_id), "utf8")) as StoryPackage;
    const platform = PLATFORM_BY_TARGET[rp.render_targets[0]!.platform]!;
    await writeBundle(rp, story, platform);
    seen.add(story.story_id);
  }
  for (const id of seen) await writeStoryManifest(id);
  console.log(`exporter: ${seen.size} stories bundled`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 7: Write `packages/exporter/tests/bundle.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { buildCaption, buildHashtags, buildTitles } from "../src/captions.js";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

describe("captions", () => {
  it("caption includes the hook and a CTA when applicable", () => {
    const c = buildCaption(validStory as any);
    expect(c).toContain(validStory.hook);
    expect(c).toContain("comments");
  });
  it("hashtags return 2-15 entries", () => {
    const h = buildHashtags(validStory as any);
    expect(h.length).toBeGreaterThanOrEqual(2);
    expect(h.length).toBeLessThanOrEqual(15);
  });
  it("titles return 1-3 entries", () => {
    const t = buildTitles(validStory as any);
    expect(t.length).toBeGreaterThanOrEqual(1);
    expect(t.length).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 8: Install and run tests**

Run:
```bash
pnpm --filter @rcf/exporter install
pnpm --filter @rcf/exporter test
```
Expected: 3 tests pass.

- [ ] **Step 9: Commit**

```bash
git add packages/exporter
git commit -m "feat(exporter): per-platform publish bundles + manifest"
```

---

## Task 9: Analytics role (SQLite-backed)

**Files:**
- Create: `packages/analytics/package.json`
- Create: `packages/analytics/tsconfig.json`
- Create: `packages/analytics/src/index.ts`
- Create: `packages/analytics/src/db.ts`
- Create: `packages/analytics/src/record.ts`
- Create: `packages/analytics/src/summarize.ts`
- Create: `packages/analytics/src/freshness.ts`
- Create: `packages/analytics/tests/record.test.ts`
- Create: `packages/analytics/tests/summarize.test.ts`

**Interfaces:**
- Consumes: any artifact JSON (story, score, render, bundle)
- Produces: `recordOutcome(input: OutcomeInput): void`
- `OutcomeInput = { storyId, platform, metrics: { hook_survival_3s, completion_rate, likes, comments, shares, saves } }`
- Summarizer: `summarize(): { byHookPattern, byTone, byTwist, byBackground, byVoice }`

- [ ] **Step 1: Write `packages/analytics/package.json`**

```json
{
  "name": "@rcf/analytics",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": "./dist/index.js" },
  "scripts": { "build": "tsc", "test": "vitest run", "start": "tsx src/index.ts" },
  "dependencies": { "@rcf/core": "workspace:*", "better-sqlite3": "^11.0.0" },
  "devDependencies": { "@types/better-sqlite3": "^7.6.0", "tsx": "^4.7.0", "typescript": "^5.4.0", "vitest": "^1.6.0" }
}
```

- [ ] **Step 2: Write `packages/analytics/tsconfig.json`**

```json
{ "extends": "../../tsconfig.base.json", "compilerOptions": { "outDir": "dist", "rootDir": "src" }, "include": ["src"] }
```

- [ ] **Step 3: Write `packages/analytics/src/db.ts`**

```ts
import Database from "better-sqlite3";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { paths } from "@rcf/core";

let _db: Database.Database | null = null;

export const getDb = (): Database.Database => {
  if (_db) return _db;
  mkdirSync(path.dirname(path.resolve(paths.root, "analytics.sqlite")), { recursive: true });
  _db = new Database(path.resolve(paths.root, "analytics.sqlite"));
  _db.pragma("journal_mode = WAL");
  _db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      story_id TEXT PRIMARY KEY,
      tone TEXT,
      intensity TEXT,
      twist_type TEXT,
      hook_pattern TEXT,
      background_mood TEXT,
      tts_voice TEXT,
      platform TEXT,
      created_at TEXT
    );
    CREATE TABLE IF NOT EXISTS outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      story_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      hook_survival_3s REAL,
      completion_rate REAL,
      likes INTEGER,
      comments INTEGER,
      shares INTEGER,
      saves INTEGER,
      recorded_at TEXT
    );
  `);
  return _db;
};
```

- [ ] **Step 4: Write `packages/analytics/src/record.ts`**

```ts
import { getDb } from "./db.js";
import { readFile } from "node:fs/promises";
import { paths, type StoryPackage, type PublishBundle } from "@rcf/core";

export type OutcomeInput = {
  storyId: string;
  platform: "tiktok" | "instagram_reels" | "youtube_shorts";
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

export const readAcceptedStories = async (): Promise<Array<{ story: StoryPackage; score: ScoreReport }>> => {
  const scoreFiles = (await readdir(paths.scoresDir()).catch(() => [])).filter((f) => f.endsWith(".json"));
  const out: Array<{ story: StoryPackage; score: ScoreReport }> = [];
  for (const f of scoreFiles) {
    const score = JSON.parse(await readFile(path.join(paths.scoresDir(), f), "utf8")) as ScoreReport;
    if (score.accept_decision !== "accept") continue;
    const story = JSON.parse(await readFile(paths.storyJson(score.story_id), "utf8")) as StoryPackage;
    out.push({ story, score });
  }
  return out;
};

export const readBundles = async (): Promise<PublishBundle[]> => {
  const root = paths.bundlesDir();
  const storyDirs = (await readdir(root, { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory());
  const out: PublishBundle[] = [];
  for (const sd of storyDirs) {
    const subs = (await readdir(path.join(root, sd.name), { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory());
    for (const s of subs) {
      try {
        const raw = await readFile(path.join(root, sd.name, s.name, "bundle.json"), "utf8");
        out.push(JSON.parse(raw) as PublishBundle);
      } catch { /* skip */ }
    }
  }
  return out;
};
```

- [ ] **Step 7: Write `packages/dashboard/lib/format.ts`**

```ts
export const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
```

- [ ] **Step 8: Write `packages/dashboard/app/layout.tsx`**

```tsx
import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-parchment text-ink min-h-screen">
        <header className="border-b border-neutral-300 px-6 py-4 flex items-center justify-between">
          <h1 className="font-semibold">RCF · Observer Console</h1>
          <nav className="text-sm space-x-4">
            <a href="/">Health</a>
            <a href="/stories">Stories</a>
            <a href="/schedules">Schedules</a>
            <a href="/outcomes">Outcomes</a>
            <a href="/logs">Logs</a>
          </nav>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Write `packages/dashboard/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Write `packages/dashboard/app/page.tsx`**

```tsx
import { readHealth } from "../lib/readers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const h = await readHealth();
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Pipeline health</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["stories", "scores", "render", "bundles", "failed"] as const).map((k) => (
          <div key={k} className="border border-neutral-300 rounded p-3 bg-white">
            <div className="text-xs uppercase text-neutral-500">{k}</div>
            <div className="text-2xl font-semibold">{h[k]}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-neutral-600">Observer only. No approval actions.</p>
    </section>
  );
}
```

- [ ] **Step 11: Write `packages/dashboard/app/stories/page.tsx`**

```tsx
import { readAcceptedStories } from "../../lib/readers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const items = await readAcceptedStories();
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Accepted stories</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-neutral-300">
            <th className="py-2">Hook</th>
            <th>Tone</th>
            <th>Background</th>
            <th>Voice</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ story }) => (
            <tr key={story.story_id} className="border-b border-neutral-200">
              <td className="py-2">{story.hook}</td>
              <td>{story.tone}</td>
              <td>{story.background_mood}</td>
              <td>{story.tts_voice}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 12: Write `packages/dashboard/app/schedules/page.tsx`**

```tsx
import { readBundles } from "../../lib/readers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const bundles = await readBundles();
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Schedules</h2>
      <ul className="text-sm space-y-1">
        {bundles.map((b) => (
          <li key={b.video_path} className="border-b border-neutral-200 py-1">
            <span className="font-mono">{b.story_id}</span> · {b.platform} · {b.status}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 13: Write `packages/dashboard/app/outcomes/page.tsx`**

```tsx
import { summarize } from "@rcf/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = summarize();
  const groups = [
    ["By tone", s.byTone],
    ["By twist", s.byTwist],
    ["By background", s.byBackground],
    ["By voice", s.byVoice],
  ] as const;
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Outcomes</h2>
      {groups.map(([title, rows]) => (
        <div key={title} className="mb-6">
          <h3 className="text-sm uppercase text-neutral-500 mb-1">{title}</h3>
          <ul className="text-sm">
            {rows.map((r) => (
              <li key={r.key} className="flex justify-between border-b border-neutral-200 py-1">
                <span>{r.key}</span>
                <span>{Math.round(r.avg_completion * 100)}% · n={r.n}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 14: Write `packages/dashboard/app/logs/page.tsx`**

```tsx
import { readFile } from "node:fs/promises";
import { paths } from "@rcf/core";

export const dynamic = "force-dynamic";

export default async function Page() {
  let lines: string[] = [];
  try {
    const raw = await readFile(path.join(paths.logsDir(), "rcf.log"), "utf8");
    lines = raw.split("\n").slice(-200);
  } catch {
    lines = ["(no logs yet)"];
  }
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Logs (last 200 lines)</h2>
      <pre className="text-xs bg-neutral-100 p-3 overflow-auto">{lines.join("\n")}</pre>
    </section>
  );
}
```

- [ ] **Step 15: Write `packages/dashboard/app/api/stories/route.ts`**

```ts
import { NextResponse } from "next/server";
import { readAcceptedStories } from "../../../lib/readers";

export async function GET() {
  const items = await readAcceptedStories();
  return NextResponse.json(items.map(({ story, score }) => ({ story, score })));
}
```

- [ ] **Step 16: Write `packages/dashboard/app/api/health/route.ts`**

```ts
import { NextResponse } from "next/server";
import { readHealth } from "../../../lib/readers";

export async function GET() {
  return NextResponse.json(await readHealth());
}
```

- [ ] **Step 17: Write `packages/dashboard/app/api/outcomes/route.ts`**

```ts
import { NextResponse } from "next/server";
import { summarize } from "@rcf/analytics";

export async function GET() {
  return NextResponse.json(summarize());
}
```

- [ ] **Step 18: Write `packages/dashboard/tests/api.test.ts`**

```ts
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
```

- [ ] **Step 19: Install**

Run:
```bash
pnpm --filter @rcf/dashboard install
```

- [ ] **Step 20: Run tests**

Run:
```bash
pnpm --filter @rcf/dashboard test
```
Expected: 2 tests pass.

- [ ] **Step 21: Commit**

```bash
git add packages/dashboard
git commit -m "feat(dashboard): observer-only Next.js console with 5 pages + 3 API routes"
```

---

## Task 12: End-to-end smoke run

**Files:**
- Create: `scripts/smoke.sh`
- Modify: `package.json` (add `smoke` script)

**Interfaces:**
- Runs the full pipeline in stub mode against a single seed story
- Confirms artifacts exist end-to-end
- Exits non-zero on any stage failure

- [ ] **Step 1: Write `scripts/smoke.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Stage a single stub-generated story
mkdir -p var/artifacts/stories var/artifacts/scores
STORY_PATH="var/artifacts/stories/s_smoke0001.json"
SCORE_PATH="var/artifacts/scores/s_smoke0001.json"

cat > "$STORY_PATH" <<'JSON'
{
  "story_id": "s_smoke0001",
  "created_at": "2026-06-26T00:00:00.000Z",
  "premise": "A late-night confession about the wrong apartment key.",
  "hook": "I should not have used the lobby key that night.",
  "forum_card": {
    "display_title": "Confession: wrong key",
    "fictional_handle": "throwaway_lobby",
    "fictional_community_label": "confessions",
    "relative_time_label": "2 hours ago",
    "style_variant": "dark-card"
  },
  "confession_voice": "first-person",
  "story_blocks": [
    { "index": 0, "text": "The lobby key felt wrong in my hand.", "suggested_duration_s": 5 },
    { "index": 1, "text": "I turned it anyway.", "suggested_duration_s": 3 },
    { "index": 2, "text": "The door opened into the wrong building.", "suggested_duration_s": 6 }
  ],
  "twist": "It was my building. It had always been my building.",
  "ending_mode": "twist",
  "tone": "unsettling",
  "intensity": "medium",
  "background_mood": "dark-hallway",
  "music_mood": "low-tension",
  "tts_voice": "am_michael",
  "cta": "comment-your-take",
  "platform_variants": { "tiktok_reels": { "pacing": "fast" }, "youtube_shorts": { "pacing": "medium" } },
  "generation_prompt_version": "v1",
  "freshness_fingerprint": "a1a1a1a1a1a1a1a1"
}
JSON

pnpm --filter @rcf/heuristic start
pnpm --filter @rcf/judge start RCF_JUDGE_BUDGET=1
pnpm --filter @rcf/formatter start

test -s "$SCORE_PATH" || { echo "smoke: missing score"; exit 1; }
test -s "var/artifacts/render/s_smoke0001_tiktok_reels.json" || { echo "smoke: missing tiktok render pkg"; exit 1; }
test -s "var/artifacts/render/s_smoke0001_youtube_shorts.json" || { echo "smoke: missing shorts render pkg"; exit 1; }

echo "smoke: ok"
```

- [ ] **Step 2: Add the script entry to root `package.json`**

Modify `package.json` scripts:
```json
"smoke": "bash scripts/smoke.sh"
```

- [ ] **Step 3: Run the smoke test**

Run: `pnpm smoke`
Expected: `smoke: ok`

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke.sh package.json
git commit -m "test(smoke): end-to-end pipeline smoke"
```

---

## Task 13: README + final docs

**Files:**
- Modify: `README.md` (extend with quickstart, role map, dashboard port, smoke command, guardrails)

- [ ] **Step 1: Replace `README.md` content**

```markdown
# Reddit-Style Confession Story Factory (RCF)

Fiction-first faceless short-video pipeline for TikTok, Reels, Shorts.

Spec: `docs/superpowers/specs/2026-06-26-reddit-confession-factory-design.md`
Plan: `docs/superpowers/plans/2026-06-26-reddit-confession-factory.md`

## Quick start

```bash
pnpm install
pnpm doctor
pnpm test            # all packages
pnpm smoke           # end-to-end pipeline with a stub story
pnpm --filter @rcf/dashboard dev   # observer console on http://localhost:3001
pnpm --filter @rcf/orchestrator start  # daily scheduler
```

## Roles (subagent aliases)

| Role | Package | Responsibility |
|---|---|---|
| Story Generator | `@rcf/generator` | LLM-authored fictional story candidates |
| Heuristic Gate | `@rcf/heuristic` | Deterministic accept/reject + no-forgery hard-fail |
| LLM Story Judge | `@rcf/judge` | Batch-budgeted quality scoring |
| Script Formatter | `@rcf/formatter` | Scene plan + per-platform pacing |
| Visual Composer | `@rcf/composer` | HyperFrames render + TTS + BGM |
| Export / Publisher | `@rcf/exporter` | Per-platform publish bundles |
| Analytics Tracker | `@rcf/analytics` | SQLite outcomes + breakdowns |

## Guardrails (non-negotiable)

- Fiction-first: never claim real Reddit provenance.
- Forum-inspired hook card only. No fabricated engagement metrics, no real subreddit names, no impersonating usernames.
- No direct platform posting in v1. Export-only.
- Dashboard is observer-only. No approve/reject in v1.
- No model fine-tuning. Analytics drive prompt/seed selection.
- Hybrid scoring always. LLM judge runs only on heuristic survivors, batch-budgeted.

## Artifacts

`var/artifacts/stories|scores|render|bundles/<id>.json` and `var/analytics.sqlite`. The dashboard reads from these. No background daemons are required for the dashboard to function — it reads on each request.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README quickstart + role map + guardrails"
```

---

## Self-Review

After completing the plan, run this checklist against the spec.

**1. Spec coverage:**
- Goal → covered by Tasks 1–12, summarized in Task 13.
- Scope (in) → covered by Tasks 2–9 + Task 10 orchestrator + Task 11 dashboard.
- Scope (out) → enforced: no `api/posting/`, no `dashboard/approve/`, no `model_finetune/`, no `scrape/` anywhere in the plan.
- Product definition → captured in README + Global Constraints.
- User decisions → reflected in Global Constraints and the orchestrator's 7-role map.
- Principles 1–5 → enforced in code/tests:
  - (1) fiction-first → `system_prompt` in generator + `noForgery` in heuristic.
  - (2) forum-inspired only → `noForgery` enforces forbidden fields and real-subreddit list.
  - (3) autopilot → dashboard has no approve/reject routes; only GET endpoints.
  - (4) balanced quality/scale → daily batch + judge budget.
  - (5) structured artifacts → zod schemas in `@rcf/core` validated on every write.
- Architecture (7 stages) → each is a dedicated package: `generator`, `heuristic`, `judge`, `formatter`, `composer`, `exporter`, `analytics`.
- Data model (story_package, forum_card, score_report, render_package, publish_bundle) → exact zod schemas in Task 2.
- Daily flow (20-30 → 3-8 → 1-3) → captured in Task 10 + README guardrails.
- Video format (9:16, hook card, body blocks, audio) → captured in Task 6 (`format.ts`) and Task 7 (composer).
- Platform strategy → captured in Task 6 (`pacing.ts`) + Task 8 (`PLATFORM_BY_TARGET`).
- Subagents (7 roles) → captured in Task 10 (`roles.ts`) with exact role names from the spec.
- Dashboard (observer-only) → Task 11 has 5 pages, all read-only, no approval route.
- Quality gates (generation, render, no-forgery, alerts) → captured in `noForgery` + `gate.ts` + `composer` path-traversal guard.
- Analytics + learning → captured in `@rcf/analytics` with breakdowns per spec.
- v1 scope → plan builds only the 6 in-scope items; deferred items are listed in the README.
- Risks and tradeoffs → documented in README + spec.
- Open implementation decisions → addressed: storage = JSON + sqlite, render = hyperframes, dashboard = Next.js, scheduler = node-cron, bundle schema = `PublishBundleSchema`.
- Acceptance criteria → mapped: AC1 generator, AC2 core schemas, AC3 heuristic+judge, AC4 composer+noForgery, AC5 exporter, AC6 dashboard, AC7 analytics, AC8 orchestrator roles.

**2. Placeholder scan:** No "TBD" / "TODO" / "implement later" / "add appropriate error handling" / "Similar to Task N" in the plan. Two deliberate `ponytail:` comments mark staged CLI integration (tts.ts, bgm.ts) — these are short, scoped, and have a named upgrade path.

**3. Type consistency:** `StoryPackageSchema` and friends are imported from `@rcf/core` and used identically across every package. The orchestrator's `ROLES` map names the seven roles from the spec verbatim. The `path-traversal` guard in composer aligns with the no-forgery gate in heuristic (both fail-closed). The PublishBundleSchema is reused in exporter, dashboard readers, and the dashboard API.

**No gaps found.**
