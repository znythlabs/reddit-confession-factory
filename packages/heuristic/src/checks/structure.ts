import type { StoryPackage } from "@rcf/core";

export const structure = (s: StoryPackage) => {
  const ok =
    s.premise.length > 0 &&
    s.twist.length > 0 &&
    s.story_blocks.length >= 2 &&
    s.story_blocks.every((b, i) => b.index === i);
  return { name: "structure", pass: ok };
};
