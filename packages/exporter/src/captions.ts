import type { StoryPackage } from "@rcf/core";

export const buildCaption = (s: StoryPackage): string => {
  const base = s.hook;
  const cta =
    s.cta === "comment-your-take"
      ? "\n\nWhat would you have done? Tell me in the comments."
      : s.cta === "share-if-relate"
        ? "\n\nShare if you have been there."
        : s.cta === "follow-for-part-2"
          ? "\n\nFollow for part 2."
          : "";
  return `${base}${cta}`;
};

export const buildHashtags = (s: StoryPackage): string[] => {
  const base = ["#storytime", "#confession", "#fictionalstory", "#shorts"];
  const tone =
    s.tone === "unsettling" || s.tone === "ominous" || s.tone === "tense"
      ? ["#creepy", "#moody"]
      : ["#reflective", "#emotional"];
  return [...base, ...tone, "#aiart"].slice(0, 8);
};

export const buildTitles = (s: StoryPackage): string[] => [
  s.hook,
  `Confession: ${s.forum_card.display_title}`,
  s.twist,
].slice(0, 3);
