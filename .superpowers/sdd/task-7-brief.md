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

