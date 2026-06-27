import { describe, it, expect, beforeEach } from "vitest";
import { getDb } from "../src/db.js";
import { recordAll } from "../src/record.js";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { paths, StoryPackageSchema, type StoryPackage } from "@rcf/core";
import validStory from "../../heuristic/tests/fixtures/valid-story.json" assert { type: "json" };

const baseStory: StoryPackage = StoryPackageSchema.parse(validStory);

const stageBundle = (storyId: string, platform: string) => {
  const dir = join(paths.bundlesDir(), storyId, platform);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, "bundle.json"),
    JSON.stringify({
      story_id: storyId,
      platform,
      video_path: "C:/fake/video.mp4",
      caption: "Test caption for the smoke bundle.",
      title_options: ["Test title"],
      hashtags: ["#test", "#smoke"],
      status: "ready",
    })
  );
  mkdirSync(paths.storiesDir(), { recursive: true });
  // Use the filename as the story_id so recordBundle reads a story whose
  // story_id matches the bundle's story_id (otherwise INSERT OR REPLACE
  // on the stories PK collapses everything to the fixture's id).
  const story: StoryPackage = { ...baseStory, story_id: storyId };
  writeFileSync(paths.storyJson(storyId), JSON.stringify(story, null, 2));
};

describe("recordAll", () => {
  beforeEach(() => {
    process.env.RCF_VAR_DIR = mkdtempSync(join(tmpdir(), "rcf-record-all-"));
  });

  it("returns 0 when no bundles are present", async () => {
    expect(await recordAll()).toBe(0);
  });

  it("walks bundles/<storyId>/<platform>/ and records each", async () => {
    stageBundle("s_recordall_a", "tiktok");
    stageBundle("s_recordall_b", "instagram_reels");
    stageBundle("s_recordall_c", "youtube_shorts");

    const n = await recordAll();
    expect(n).toBe(3);

    const db = getDb();
    const row = db.prepare("SELECT COUNT(*) AS n FROM stories").get() as { n: number };
    expect(row.n).toBe(3);
  });

  it("skips bundles whose bundle.json is missing", async () => {
    stageBundle("s_recordall_good", "tiktok");
    mkdirSync(join(paths.bundlesDir(), "s_recordall_bad", "tiktok"), { recursive: true });
    // no bundle.json written

    const n = await recordAll();
    expect(n).toBe(1);
  });
});
