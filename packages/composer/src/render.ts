import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import type { RenderPackage, StoryPackage } from "@rcf/core";
import { scaffoldProject } from "./project.js";

const pexec = promisify(execFile);

export const renderRenderPackage = async (rp: RenderPackage, story: StoryPackage): Promise<{ out_path: string }> => {
  const projectDir = await scaffoldProject(rp, story);
  const out = rp.render_targets[0]!.out_path;
  // ponytail: shells out to npx hyperframes render --project <dir> --out <out>
  await pexec("npx", ["hyperframes", "render", "--project", projectDir, "--out", out], {
    cwd: path.resolve(process.cwd()),
  });
  return { out_path: out };
};
