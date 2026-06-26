import { z } from "zod";

export const HeuristicCheckSchema = z.object({
  name: z.string(),
  pass: z.boolean(),
  detail: z.string().optional(),
});

export const JudgeScoresSchema = z.object({
  hook_strength: z.number().min(0).max(10),
  escalation: z.number().min(0).max(10),
  coherence: z.number().min(0).max(10),
  plausibility: z.number().min(0).max(10),
  novelty: z.number().min(0).max(10),
  payoff: z.number().min(0).max(10),
  ai_smell: z.number().min(0).max(10), // higher = more obviously machine-written
});

export const ScoreReportSchema = z.object({
  story_id: z.string(),
  heuristic_checks: z.array(HeuristicCheckSchema),
  heuristic_pass: z.boolean(),
  judge_scores: JudgeScoresSchema.optional(),
  judge_summary: z.string().max(800).optional(),
  accept_decision: z.enum(["accept", "reject"]),
  reject_reasons: z.array(z.string()),
});
export type HeuristicCheck = z.infer<typeof HeuristicCheckSchema>;
export type JudgeScores = z.infer<typeof JudgeScoresSchema>;
export type ScoreReport = z.infer<typeof ScoreReportSchema>;
