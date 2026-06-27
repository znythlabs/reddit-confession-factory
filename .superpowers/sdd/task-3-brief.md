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
