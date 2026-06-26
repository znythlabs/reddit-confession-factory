import { randomBytes } from "node:crypto";

export const newStoryId = (): string => {
  const ts = Date.now().toString(36);
  const rand = randomBytes(4).toString("hex");
  return `s_${ts}_${rand}`;
};

export const newBatchId = (): string => {
  const ts = Date.now().toString(36);
  const rand = randomBytes(3).toString("hex");
  return `b_${ts}_${rand}`;
};
