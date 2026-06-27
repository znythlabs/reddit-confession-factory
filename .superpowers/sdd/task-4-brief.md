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

