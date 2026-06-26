import type { StoryPackage } from "@rcf/core";

export const segmentBlocks = (s: StoryPackage): { index: number; text: string; duration_s: number }[] =>
  s.story_blocks.map((b) => ({ index: b.index, text: b.text, duration_s: b.suggested_duration_s }));
