import { writeFile, mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, PublishBundleSchema } from "@rcf/core";

type PublishBundle = ReturnType<typeof PublishBundleSchema.parse>;

export const writeStoryManifest = async (storyId: string): Promise<void> => {
  const dir = paths.bundleDir(storyId);
  await mkdir(dir, { recursive: true });
  const subs = (await readdir(dir, { withFileTypes: true })).filter((d) => d.isDirectory());
  const bundles: PublishBundle[] = [];
  for (const s of subs) {
    try {
      const raw = await readFile(path.join(dir, s.name, "bundle.json"), "utf8");
      bundles.push(JSON.parse(raw) as PublishBundle);
    } catch {
      // skip incomplete
    }
  }
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify({ story_id: storyId, bundles }, null, 2));
};
