import { readFile, writeFile, mkdir } from "node:fs/promises";
import { z } from "zod";
import { ScoreReportSchema, paths, JudgeScoresSchema, StoryPackageSchema } from "@rcf/core";
import { makeStubJudgeLlm, type JudgeLlm } from "./llm.js";
import { RUBRIC_SYSTEM, RUBRIC_TEMPLATE, RUBRIC_VERSION } from "./rubric.js";

// Compile-level fix: @rcf/core does not re-export the inferred StoryPackage / ScoreReport
// types. Derive them locally so the brief's `as StoryPackage` / `Promise<ScoreReport[]>`
// signatures still type-check. Behavior is unchanged.
type StoryPackage = z.infer<typeof StoryPackageSchema>;
type ScoreReport = z.infer<typeof ScoreReportSchema>;
const ACCEPT_FLOOR = 6.5;
const AI_SMELL_CEILING = 6.0;

export const judgeSurvivors = async (
  scorePaths: string[],
  opts: { budgetMax: number; llm?: JudgeLlm } = { budgetMax: 8 }
): Promise<ScoreReport[]> => {
  const llm = opts.llm ?? makeStubJudgeLlm();
  const out: ScoreReport[] = [];
  const limited = scorePaths.slice(0, opts.budgetMax);
  for (const sp of limited) {
    const scoreReport = JSON.parse(await readFile(sp, "utf8")) as ScoreReport;
    if (!scoreReport.heuristic_pass) continue;
    const storyId = scoreReport.story_id;
    const story = JSON.parse(await readFile(paths.storyJson(storyId), "utf8")) as StoryPackage;
    const raw = await llm.judge(RUBRIC_SYSTEM, RUBRIC_TEMPLATE(story));
    const parsed = JSON.parse(raw);
    const scores = JudgeScoresSchema.parse({
      hook_strength: parsed.hook_strength,
      escalation: parsed.escalation,
      coherence: parsed.coherence,
      plausibility: parsed.plausibility,
      novelty: parsed.novelty,
      payoff: parsed.payoff,
      ai_smell: parsed.ai_smell,
    });
    const avg =
      (scores.hook_strength + scores.escalation + scores.coherence + scores.plausibility + scores.novelty + scores.payoff) /
      6;
    const verdict = avg >= ACCEPT_FLOOR && scores.ai_smell <= AI_SMELL_CEILING ? "accept" : "reject";
    const updated: ScoreReport = ScoreReportSchema.parse({
      ...scoreReport,
      judge_scores: scores,
      judge_summary: parsed.summary ?? "",
      accept_decision: verdict,
      reject_reasons:
        verdict === "reject"
          ? [
              ...scoreReport.reject_reasons,
              `judge: avg=${avg.toFixed(2)} ai_smell=${scores.ai_smell}`,
              `prompt_version=${RUBRIC_VERSION}`,
            ]
          : scoreReport.reject_reasons,
    });
    await mkdir(paths.scoresDir(), { recursive: true });
    await writeFile(paths.scoreJson(storyId), JSON.stringify(updated, null, 2));
    out.push(updated);
  }
  return out;
};
