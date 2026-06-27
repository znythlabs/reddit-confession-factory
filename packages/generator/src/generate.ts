import { StoryPackageSchema, newStoryId, paths } from "@rcf/core";
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { z } from "zod";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts.js";
import type { LlmClient } from "./llm.js";
import { makeStubLlm } from "./llm.js";

type StoryPackage = z.infer<typeof StoryPackageSchema>;

export type GenerateSeed = {
  tone: string;
  intensity: string;
  endingMode: string;
  runtimeTarget: number;
  platforms: string[];
};

export const generateStoryPackage = async (
  seed: GenerateSeed,
  llm: LlmClient = makeStubLlm()
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
  const text = [p.premise ?? "", p.twist ?? "", (p.story_blocks ?? []).map((b) => b.text).join("|")].join("|");
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
};
