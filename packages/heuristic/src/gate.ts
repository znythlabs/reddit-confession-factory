import { ScoreReportSchema, type StoryPackage, type ScoreReport, paths } from "@rcf/core";
import { writeFile, mkdir } from "node:fs/promises";
import { runtimeFit } from "./checks/runtime-fit.js";
import { hookLength } from "./checks/hook-length.js";
import { cadence } from "./checks/cadence.js";
import { duplicate } from "./checks/duplicate.js";
import { bannedEndings } from "./checks/banned-endings.js";
import { readability } from "./checks/readability.js";
import { structure } from "./checks/structure.js";
import { noForgery } from "./no-forgery.js";

export const runHeuristicGate = async (story: StoryPackage): Promise<ScoreReport> => {
  const forgery = noForgery(story);
  const checks = await Promise.all([
    runtimeFit(story),
    hookLength(story),
    cadence(story),
    duplicate(story),
    bannedEndings(story),
    readability(story),
    structure(story),
  ]);
  const allPass = forgery.pass && checks.every((c) => c.pass);
  const report = ScoreReportSchema.parse({
    story_id: story.story_id,
    heuristic_checks: checks,
    heuristic_pass: allPass,
    accept_decision: allPass ? "accept" : "reject",
    reject_reasons: [
      ...checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail ?? "failed"}`),
      ...forgery.hits,
    ],
  });
  await mkdir(paths.scoresDir(), { recursive: true });
  await writeFile(paths.scoreJson(story.story_id), JSON.stringify(report, null, 2));
  return report;
};
