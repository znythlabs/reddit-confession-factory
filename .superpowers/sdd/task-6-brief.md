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
