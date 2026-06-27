import { runDailyBatch } from "./batch.js";

const summary = await runDailyBatch({
  generateCount: Number(process.env.RCF_GENERATE_COUNT ?? "5"),
  judgeBudget: Number(process.env.RCF_JUDGE_BUDGET ?? "4"),
});
console.log(JSON.stringify(summary, null, 2));
