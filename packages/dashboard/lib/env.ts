// Force RCF_VAR_DIR to the workspace var/ before any path lookup happens.
// The dashboard process starts in packages/dashboard, so paths.root's fallback
// (process.cwd()/var) would resolve to packages/dashboard/var — empty.
// Every page and API route imports this as a side effect so the override
// is in place before @rcf/core is evaluated.

import path from "node:path";

if (!process.env.RCF_VAR_DIR) {
  process.env.RCF_VAR_DIR = path.resolve(process.cwd(), "../..", "var");
}
