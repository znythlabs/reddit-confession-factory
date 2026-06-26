export const ctaText = (c: string): string => {
  switch (c) {
    case "follow-for-part-2":
      return "Follow for part 2.";
    case "comment-your-take":
      return "What would you have done?";
    case "share-if-relate":
      return "Share if you have been there.";
    default:
      return "";
  }
};
