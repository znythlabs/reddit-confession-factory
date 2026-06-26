import type { StoryPackage } from "@rcf/core";

const BANNED = [/and then i woke up/i, /it was all a dream/i, /the end\./i];

export const bannedEndings = (s: StoryPackage) => {
  const haystack = `${s.twist} ${s.story_blocks.map((b) => b.text).join(" ")}`;
  const hit = BANNED.find((re) => re.test(haystack));
  return { name: "banned-endings", pass: !hit, detail: hit ? hit.source : undefined };
};
