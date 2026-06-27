import { summarize } from "./summarize.js";
import { recordOutcome, recordBundle } from "./record.js";

const main = async () => {
  const sum = summarize();
  console.log(JSON.stringify(sum, null, 2));
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
