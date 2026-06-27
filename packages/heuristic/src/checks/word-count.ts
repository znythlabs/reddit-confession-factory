import type { StoryPackage } from "@rcf/core";

export const wordCount = (s: StoryPackage) => {
  const text = [
    s.hook,
    ...s.story_blocks.map((b) => b.text),
    s.twist,
  ].join(" ");

  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const ok = words >= 90 && words <= 155;

  return {
    name: "word-count",
    pass: ok,
    detail: `words=${words}, required=90-155`,
  };
};
