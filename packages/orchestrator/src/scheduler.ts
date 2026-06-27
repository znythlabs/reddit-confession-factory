import cron from "node-cron";
import { runDailyBatch } from "./batch.js";

export const startScheduler = (): void => {
  cron.schedule("0 9 * * *", async () => {
    const s = await runDailyBatch({ generateCount: 25, judgeBudget: 8 });
    console.log("daily batch:", s);
  });
  console.log("scheduler: daily 09:00 registered");
};
