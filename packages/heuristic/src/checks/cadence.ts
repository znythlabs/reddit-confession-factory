import type { StoryPackage } from "@rcf/core";

export const cadence = (s: StoryPackage) => {
  if (s.story_blocks.length < 3) {
    return { name: "cadence", pass: false, detail: "needs at least 3 blocks" };
  }
  const varying = new Set(s.story_blocks.map((b) => Math.round(b.suggested_duration_s))).size >= 2;
  return { name: "cadence", pass: varying, detail: `durations=${s.story_blocks.map((b) => b.suggested_duration_s).join(",")}` };
};
