import { getDb } from "./db.js";

export const recentHookPatterns = (limit = 50): string[] => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT hook_pattern FROM stories ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as Array<{ hook_pattern: string }>;
  return rows.map((r) => r.hook_pattern);
};
