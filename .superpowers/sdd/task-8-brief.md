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
