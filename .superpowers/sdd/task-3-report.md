# Task 3 Report — Story Generator role

## Status

**DONE.** All 7 files from the brief created, tests pass, commit landed on `task-3-generator`.

## Commit

- Branch: `task-3-generator`
- Hash: `8e93ddc9b204f0176a2ae61bf442c3d4a6612c7e`
- Message: `feat(generator): story generator role with prompt + LLM stub`
- 10 files changed, 550 insertions(+), 8 deletions(-)

## Files created

| Path | Bytes | Purpose |
| --- | --- | --- |
| `packages/generator/package.json` | 451 | manifest (zod dep, tsx/vitest/typescript devDeps) |
| `packages/generator/tsconfig.json` | 127 | extends root `tsconfig.base.json`, outDir `dist` |
| `packages/generator/src/prompts.ts` | 962 | `SYSTEM_PROMPT` + `buildUserPrompt(seed)` |
| `packages/generator/src/llm.ts` | 1025 | `LlmClient` interface, `makeStubLlm`, `makeOpenAiCompatibleLlm` |
| `packages/generator/src/variants.ts` | 489 | tones / intensities / endings tuples, `pickRandom` |
| `packages/generator/src/generate.ts` | 1591 | `generateStoryPackage`, `persistStory`, `hashFreshness` |
| `packages/generator/src/index.ts` | 742 | CLI loop driven by `RCF_GENERATE_COUNT` |
| `packages/generator/tests/generate.test.ts` | 2336 | 2 vitest cases |
| root `package.json` | +3 lines | added `@types/node` to root devDependencies |
| `pnpm-lock.yaml` | +333 lines | lockfile refreshed for new workspace package |

## Compile-level fixes applied to the brief code

The brief allowed compile-level fixes; two were strictly necessary:

1. **`generate.ts` crypto import** — the brief used `const crypto = require("node:crypto")` inside an ESM package (`"type": "module"`). `require` is undefined in ESM, so `hashFreshness` would throw `ReferenceError: require is not defined` at runtime, and `freshness_fingerprint` would be undefined, causing `StoryPackageSchema.parse` to fail and both tests to throw.
   - Fix: top-level `import { createHash } from "node:crypto"`, then `createHash("sha256").update(...).digest("hex")` in `hashFreshness`.
2. **`generate.ts` `StoryPackage` type import** — the brief wrote `import { StoryPackageSchema, type StoryPackage, newStoryId, paths } from "@rcf/core"`, but `@rcf/core` (Task 2) exports only `StoryPackageSchema` and the inferred type. `tsc` failed with `TS2305: Module '"@rcf/core"' has no exported member 'StoryPackage'` and a downstream `TS7006: Parameter 'b' implicitly has an 'any' type` inside `hashFreshness`. Vitest's transpile-only mode hid this from the test run, but `pnpm build` is part of the package contract.
   - Fix: drop the named type import, add `import { z } from "zod"`, derive locally with `type StoryPackage = z.infer<typeof StoryPackageSchema>`. Runtime behaviour is identical.

## Test evidence (RED → GREEN)

The brief's two test cases both pass. The path to GREEN was not clean — three external blockers had to be resolved before vitest could even load the suite.

### Blocker 1: outdated `pnpm-lock.yaml`

`pnpm --filter @rcf/generator install` failed with:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because
pnpm-lock.yaml is not up to date with packages\generator\package.json
specifiers in the lockfile ({}) don't match specs in package.json
({"tsx":"^4.7.0","typescript":"^5.4.0","vitest":"^1.6.0",
  "@rcf/core":"workspace:*","zod":"^3.23.8"})
```

Resolution: `pnpm install --no-frozen-lockfile` at the root. Added 80 packages (mostly esbuild / vitest deps). Expected when introducing a new workspace package.

### Blocker 2: `@rcf/core` not built → vitest can't resolve the package

First `pnpm --filter @rcf/generator test` produced:

```
FAIL  tests/generate.test.ts
Error: Failed to resolve entry for package "@rcf/core".
The package may have incorrect main/module/exports specified in its package.json.
Test Files  1 failed (1)   Tests  0 |  Duration  638ms
```

`@rcf/core` declares `"main": "./dist/index.js"` but `dist/` was never produced in this worktree. vitest discovered the test file (it was listed at the top: `tests/generate.test.ts (0 test)`) but bailed at the import-resolution step.

### Blocker 3: `@rcf/core` build itself failed (pre-existing Task 2 gap)

`pnpm --filter @rcf/core build` failed:

```
src/ids.ts(1,29): error TS2307: Cannot find module 'node:crypto' or its
corresponding type declarations.
src/paths.ts(1,18): error TS2307: Cannot find module 'node:path' or its
corresponding type declarations.
src/paths.ts(3,16): error TS2580: Cannot not find name 'process'. Do you
need to install type definitions for node?
```

`@rcf/core`'s `package.json` lists only `typescript` and `vitest` as devDependencies — no `@types/node`. This is a Task 2 deliverable gap, not a Task 3 issue, but it blocks building the generator for downstream consumers. Resolution: `pnpm add -Dw @types/node` at the root. This adds `@types/node ^26.0.1` to the root `package.json` only; `@rcf/core`'s package.json is untouched. After this, `pnpm --filter @rcf/core build` produces `dist/index.js`, `dist/ids.js`, `dist/paths.js`, `dist/schemas/*.js`, and vitest resolves `@rcf/core`.

### GREEN — test run

```
$ pnpm --filter @rcf/generator test
> @rcf/generator@0.0.0 test E:\dev\reddit-confession-factory\.worktrees\task-3-generator\packages\generator
> vitest run

 RUN  v1.6.1 E:/dev/reddit-confession-factory/.worktrees/task-3-generator/packages/generator

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  03:53:12
   Duration  725ms (transform 102ms, setup 0ms, collect 147ms, tests 6ms,
                 environment 0ms, prepare 213ms)
```

### GREEN — `tsc` build

```
$ pnpm --filter @rcf/generator build
> @rcf/generator@0.0.0 build E:\dev\reddit-confession-factory\.worktrees\task-3-generator\packages\generator
> tsc
(no output — clean compile)
```

## Concerns / handoff notes

1. **`@types/node` added at root** — Task 2's `@rcf/core` should arguably own this devDep directly. Adding it at root works for the workspace but is a leak across package boundaries. Flag for the Task 2 follow-up / a hygiene pass.
2. **`pnpm-lock.yaml` was rewritten** — the brief's `git add packages/generator` line was insufficient; the lockfile update is also committed so future `pnpm install --frozen-lockfile` runs succeed.
3. **`makeOpenAiCompatibleLlm` is implemented but not exercised by tests** — only the stub is used. It compiles cleanly and the import path is wired, but the next task (`healer` or `scorer`) should add at least one test that asserts a `fetch` call shape (status, headers, body) before any real provider is wired up. The brief explicitly scoped tests to the generator role, so this is out of Task 3 scope.
4. **`hashFreshness` is content-only, no time component** — the brief's implementation hashes premise + twist + story_blocks text. Two stories with identical text would collide. The fingerprint is 16 hex chars (64 bits), which is fine for v1, but the next task should decide whether to add `story_id` or `created_at` to the hash to guarantee uniqueness. The 16-char `.length(16)` zod constraint makes the slice intentional.
5. **`generateStoryPackage` calls `JSON.parse` on the LLM response without try/catch** — a malformed LLM response will throw an opaque parse error to the caller. Acceptable for v1 (the brief's exact code, no schema-validation guard). The scorer task should add a heuristic check for parse-success if it wants to reject malformed stories before they reach the artifact dir.
6. **No retries, no temperature / seed control on the LLM wrapper** — the OpenAI-compatible path is a single `fetch` with no backoff, and `model` is opaque. Out of scope for the generator role, but worth flagging for the caller that needs reproducibility.
7. **The CLI's `console.log` writes a `var/artifacts/stories/<id>.json` path that is repo-local** — `.gitignore` already excludes `var/`, so the artifact dir will not pollute git, but a fresh `pnpm start` will create it on first run.
