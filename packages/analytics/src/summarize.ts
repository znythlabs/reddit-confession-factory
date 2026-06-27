import { getDb } from "./db.js";

export const summarize = (): {
  byHookPattern: Array<{ key: string; avg_completion: number; n: number }>;
  byTone: Array<{ key: string; avg_completion: number; n: number }>;
  byTwist: Array<{ key: string; avg_completion: number; n: number }>;
  byBackground: Array<{ key: string; avg_completion: number; n: number }>;
  byVoice: Array<{ key: string; avg_completion: number; n: number }>;
} => {
  const db = getDb();
  const group = (col: string) =>
    db
      .prepare(
        `SELECT ${col} AS key, AVG(o.completion_rate) AS avg_completion, COUNT(*) AS n
         FROM outcomes o JOIN stories s ON s.story_id = o.story_id
         WHERE s.${col} IS NOT NULL
         GROUP BY ${col} ORDER BY avg_completion DESC`
      )
      .all() as Array<{ key: string; avg_completion: number; n: number }>;
  return {
    byHookPattern: group("hook_pattern"),
    byTone: group("tone"),
    byTwist: group("twist_type"),
    byBackground: group("background_mood"),
    byVoice: group("tts_voice"),
  };
};
