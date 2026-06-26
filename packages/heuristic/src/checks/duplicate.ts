import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { StoryPackage } from "@rcf/core";
import { paths } from "@rcf/core";

export const duplicate = async (s: StoryPackage) => {
  try {
    const dir = paths.storiesDir();
    const files = await readdir(dir);
    for (const f of files) {
      if (!f.endsWith(".json") || f === `${s.story_id}.json`) continue;
      const other = JSON.parse(await readFile(path.join(dir, f), "utf8")) as StoryPackage;
      if (other.freshness_fingerprint === s.freshness_fingerprint) {
        return { name: "duplicate", pass: false, detail: `collides with ${f}` };
      }
    }
    return { name: "duplicate", pass: true };
  } catch {
    return { name: "duplicate", pass: true };
  }
};
