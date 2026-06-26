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
