export const tones = ["unsettling", "melancholic", "ominous", "reflective", "tense"] as const;
export const intensities = ["soft", "medium", "high"] as const;
export const endings = ["cliffhanger", "bittersweet", "twist", "quiet"] as const;

export type Tone = (typeof tones)[number];
export type Intensity = (typeof intensities)[number];
export type Ending = (typeof endings)[number];

export const pickRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
