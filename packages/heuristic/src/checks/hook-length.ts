import type { StoryPackage } from "@rcf/core";

export const hookLength = (s: StoryPackage) => {
  const len = s.hook.length;
  const ok = len >= 12 && len <= 110;
  return { name: "hook-length", pass: ok, detail: `len=${len}` };
};
