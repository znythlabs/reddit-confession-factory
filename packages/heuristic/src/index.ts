import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { paths, type StoryPackage } from "@rcf/core";
import { runHeuristicGate } from "./gate.js";

const main = async () => {
  const dir = paths.storiesDir();
  const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
  let accepted = 0;
  let rejected = 0;
  for (const f of files) {
    const story = JSON.parse(await readFile(path.join(dir, f), "utf8")) as StoryPackage;
    const r = await runHeuristicGate(story);
    if (r.accept_decision === "accept") accepted++; else rejected++;
  }
  console.log(`heuristic: ${accepted} accepted, ${rejected} rejected`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
