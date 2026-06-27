import type { StoryPackage } from "@rcf/core";

export const runtimeFit = (s: StoryPackage) => {
  const total = s.story_blocks.reduce((a, b) => a + b.suggested_duration_s, 0);
  const ok = total >= 35 && total <= 60;
  return { name: "runtime-fit", pass: ok, detail: `total=${total}s, required=35-60s` };
};
