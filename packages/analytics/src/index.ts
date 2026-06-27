export { summarize } from "./summarize.js";
export { recordOutcome, recordBundle, recordStory, recordAll } from "./record.js";
export type { OutcomeInput } from "./record.js";
export { recentHookPatterns } from "./freshness.js";

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  const { summarize } = await import("./summarize.js");
  console.log(JSON.stringify(summarize(), null, 2));
}
