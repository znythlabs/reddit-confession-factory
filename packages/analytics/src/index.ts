import { summarize } from "./summarize.js";
export { summarize };
export { recordOutcome, recordBundle, recordStory, recordAll } from "./record.js";
export { recentHookPatterns } from "./freshness.js";

// ponytail: removed `await import()` to keep this a non-TLA module — Next.js's
// serverComponentsExternalPackages loader can't synchronously evaluate modules
// with top-level await. The CLI self-exec block uses the already-imported
// `summarize` re-export above, so no dynamic import is needed.
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, "/")}`).href) {
  console.log(JSON.stringify(summarize(), null, 2));
}
