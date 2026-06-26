import type { StoryPackage } from "@rcf/core";

const FORBIDDEN_KEYS = ["votes", "comments", "comment_count", "awards", "karma", "upvote", "downvote"] as const;
const REAL_SUBREDDITS = [
  "r/askreddit",
  "r/confessions",
  "r/aita",
  "r/tifu",
  "r/offmychest",
  "r/trueoffmychest",
  "r/relationship_advice",
  "r/nosleep",
  "r/letsnotmeet",
];
const IMPERSONATION_HINTS = ["real_", "official_", "mod_", "admin_"];

export const noForgery = (s: StoryPackage) => {
  const card = s.forum_card as unknown as Record<string, unknown>;
  const hits: string[] = [];

  for (const key of FORBIDDEN_KEYS) {
    if (key in card) hits.push(`forum_card has forbidden field "${key}"`);
  }
  const label = (card.fictional_community_label ?? "").toString().toLowerCase().trim();
  if (REAL_SUBREDDITS.some((sr) => label === sr || label.endsWith(sr))) {
    hits.push(`forum_card.fictional_community_label uses real subreddit "${label}"`);
  }
  const handle = (card.fictional_handle ?? "").toString().toLowerCase();
  if (IMPERSONATION_HINTS.some((h) => handle.startsWith(h))) {
    hits.push(`forum_card.fictional_handle impersonation pattern: "${handle}"`);
  }
  return { pass: hits.length === 0, hits };
};
