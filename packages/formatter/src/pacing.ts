type Platform = "tiktok_reels" | "youtube_shorts";

export const pacingFactor = (p: Platform, storyPacing: "fast" | "medium" | "slow"): number => {
  if (p === "tiktok_reels") {
    return storyPacing === "fast" ? 0.85 : 1.0;
  }
  return storyPacing === "slow" ? 1.2 : 1.0;
};

export const adjustDuration = (d: number, factor: number) => Math.max(2, Math.round(d * factor * 10) / 10);
