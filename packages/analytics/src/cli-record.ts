import { recordAll } from "./record.js";

const n = await recordAll();
console.log(`analytics: recorded ${n} bundles`);
