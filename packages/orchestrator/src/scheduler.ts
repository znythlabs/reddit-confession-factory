import cron from "node-cron";
import { runDailyBatch } from "./batch.js";

let batchInFlight = false;

export const startScheduler = (): void => {
  cron.schedule("0 9 * * *", async () => {
    if (batchInFlight) {
      console.warn("scheduler: previous batch still running, skipping this tick");
      return;
    }
    batchInFlight = true;
    try {
      const s = await runDailyBatch({ generateCount: 25, judgeBudget: 8 });
      console.log("daily batch:", s);
    } finally {
      batchInFlight = false;
    }
  });
  console.log("scheduler: daily 09:00 registered");
};
