# Task 5 Report — LLM Story Judge role (batch-budgeted)

## Status

**DONE.** All 7 files from the brief created verbatim, one strict-necessity compile fix applied in-package, both `tsc` build and `pnpm test` are GREEN (2/2), commit landed on `task-5-judge`.

## Commit

- Branch: `task-5-judge`
- Hash: `46725cf`
- Message: `feat(judge): batch-budgeted LLM judge with floor + ai_smell ceiling`
- 8 files / +182 lines
  - 7 files under `packages/judge/` (the brief's manifest)
  - 1 root `pnpm-lock.yaml` (required by `pnpm install`, see Concern 1)

## Test summary

`pnpm --filter @rcf/judge test` → **2 passed (2)** in 1 test file, 767ms.

- `judgeSurvivors > accepts a strong story` — strong rubric scores (avg ≈ 8.17, ai_smell 3) → `accept_decision: "accept"`. The 9-axis avg is over the 6.5 floor and ai_smell 3 is under the 6.0 ceiling.
- `judgeSurvivors > rejects a too-AI-smelling story` — borderline sixes (avg 6.17) plus ai_smell 9 → `accept_decision: "reject"` with `reject_reasons` appended (`judge: avg=6.17 ai_smell=9`, `prompt_version=judge-v1`).

The on-disk side effect was confirmed: after the second test the persisted `var/artifacts/scores/s_fixture_valid.json` matches the brief's `ScoreReportSchema` shape, carries the judge's scores + summary, and has the verdict flipped from the heuristic stage's `accept` to the judge stage's `reject`.

## RED / GREEN evidence

The brief is verbatim; the design space is the install + test workflow, not the implementation. The "behavior verified" claim is grounded in the post-build run below plus a manual side-effect check on the written score report.

### RED reference (what the test would catch)

The two tests assert opposite verdicts on the *same* fixture with two different stub responses. A regression that, say, hard-coded the verdict to `"accept"` or dropped the `ai_smell` term from the average would flip the second test to a failure. A regression that wrote the score report before validating it would still pass the verdict assertions but corrupt the on-disk artifact, which is why the report file is read as the second part of the evidence.

### GREEN — `pnpm test`

```
$ pnpm --filter @rcf/judge test
> @rcf/judge@0.0.0 test E:\dev\reddit-confession-factory\.worktrees\task-5-judge\packages\judge
> vitest run

 RUN  v1.6.1 E:/dev/reddit-confession-factory/.worktrees/task-5-judge/packages/judge

 Test Files  1 passed (1)
      Tests  2 passed (2)
   Start at  04:09:50
   Duration  767ms (transform 107ms, setup 0ms, collect 155ms, tests 12ms,
                 environment 0ms, prepare 211ms)
```

### GREEN — `pnpm build` (tsc)

```
$ pnpm --filter @rcf/judge build
> @rcf/judge@0.0.0 build E:\dev\reddit-confession-factory\.worktrees\task-5-judge\packages\judge
> tsc

(no output — clean compile)
```

`dist/` populated with `index.js`, `judge.js`, `llm.js`, `rubric.js`, plus `.d.ts` files. The clean build is the relevant signal here: vitest runs through esbuild and would have accepted the original brief code as-is, so the strict-necessity compile fix is what made the project actually type-check.

## Command output summary

### `pnpm install --no-frozen-lockfile` (root)

```
Scope: all 5 workspace projects
Packages: +82

devDependencies:
+ @types/node 26.0.1
```

`pnpm --filter @rcf/judge install` failed out of the box with `ERR_PNPM_OUTDATED_LOCKFILE` (the lockfile didn't yet know about the new workspace package). Same blocker Task 3 / Task 4 both documented; `--no-frozen-lockfile` at the root adds 82 packages (tsx, vitest, esbuild, etc.) and updates `pnpm-lock.yaml`.

### `pnpm --filter @rcf/core build`

```
> @rcf/core@0.0.0 build E:\dev\reddit-confession-factory\.worktrees\task-5-judge\packages\core
> tsc

(no output)
```

`@rcf/core` declares `"main": "./dist/index.js"` but `dist/` was never produced in this worktree. Without it, vitest fails to resolve `@rcf/core` (`Failed to resolve entry for package "@rcf/core"`) — same blocker Task 3 / Task 4 both documented. Building core once is sufficient; `dist/` is gitignored.

### `pnpm --filter @rcf/judge test`

See the GREEN block above: 2/2 passed in 767ms.

## Files created

| Path | Purpose | Lines |
| --- | --- | --- |
| `packages/judge/package.json` | ESM manifest, declares `@rcf/core` workspace dep, `zod` runtime dep, `tsx` / `typescript` / `vitest` devDeps; scripts: `build` (tsc), `test` (vitest run), `start` (tsx src/index.ts) | 12 |
| `packages/judge/tsconfig.json` | Extends `../../tsconfig.base.json`, `outDir: dist`, `rootDir: src`, `include: ["src"]` | 1 |
| `packages/judge/src/llm.ts` | `JudgeLlm` interface + `makeStubJudgeLlm(response)` factory (returns a stub that ignores the system/user prompts) | 6 |
| `packages/judge/src/rubric.ts` | `RUBRIC_VERSION` constant, `RUBRIC_SYSTEM` system prompt, `RUBRIC_TEMPLATE(story)` user prompt template (returns the JSON-only schema) | 16 |
| `packages/judge/src/judge.ts` | `judgeSurvivors(scorePaths, opts)` — caps at `opts.budgetMax`, skips non-`heuristic_pass`, calls LLM, parses with `JudgeScoresSchema`, computes 6-axis avg, gates on `avg >= 6.5 && ai_smell <= 6.0`, writes updated `ScoreReport` via `paths.scoreJson` | 62 |
| `packages/judge/src/index.ts` | CLI entry: lists `paths.scoresDir()` JSON, invokes `judgeSurvivors` with `RCF_JUDGE_BUDGET` (default 8), logs `judge: N/M accepted`, exits 1 on error | 17 |
| `packages/judge/tests/judge.test.ts` | Two tests — strong-story accept and ai-smell reject — sharing a `setup()` helper that writes the `validStory` fixture + a minimal heuristic-pass score report to `var/` | 47 |

## Compile-level fix applied (one, strictly necessary)

The brief's `judge.ts` opens with:

```ts
import { ScoreReportSchema, type StoryPackage, type ScoreReport, paths, JudgeScoresSchema } from "@rcf/core";
```

`@rcf/core`'s barrel `export * from "./schemas/story.js"` re-exports `StoryBlockSchema`, `ForumCardSchema`, `StoryPackageSchema` (and the same for `score.ts`), but **does not** re-export the inferred `type StoryPackage = z.infer<typeof StoryPackageSchema>` / `type ScoreReport = z.infer<typeof ScoreReportSchema>` aliases. `tsc` reports:

```
src/judge.ts(2,34): error TS2305: Module '"@rcf/core"' has no exported member 'StoryPackage'.
src/judge.ts(2,53): error TS2305: Module '"@rcf/core"' has no exported member 'ScoreReport'.
```

`vitest` (esbuild) does not enforce this, so the test still ran GREEN against the verbatim brief code — but `tsc` does not. The brief's contract is "use the exact code unless a compile-level fix is strictly necessary," and `tsc` failing qualifies.

The minimal, in-package fix (chosen over expanding scope into `@rcf/core`):

```ts
// Compile-level fix: @rcf/core does not re-export the inferred StoryPackage / ScoreReport
// types. Derive them locally so the brief's `as StoryPackage` / `Promise<ScoreReport[]>`
// signatures still type-check. Behavior is unchanged.
type StoryPackage = z.infer<typeof StoryPackageSchema>;
type ScoreReport = z.infer<typeof ScoreReportSchema>;
```

Plus the matching value import: `import { …, StoryPackageSchema } from "@rcf/core";` and a new `import { z } from "zod";`. No runtime semantics change. The test file does not import these types, so it needs no equivalent fix.

**Why not fix `@rcf/core` instead?** It's a real fix and arguably the right one (adding `export type StoryPackage = z.infer<typeof StoryPackageSchema>;` in `core/src/schemas/story.ts` and the same for `ScoreReport` would close the gap for every consumer, including `packages/heuristic/src/gate.ts` which hits the identical error). The brief's scope says "Keep this task focused to `packages/judge` only unless a compile-level fix is strictly necessary." A compile-level fix in `@rcf/core` is allowed by that clause, but a fix in `judge.ts` is the smaller change and avoids re-running Tasks 2–4's build for a `core` regression. Flagged for the orchestrator in Concern 4.

## Acceptance check

- [x] `packages/judge` contains the manifest, tsconfig, LLM interface, rubric, judge implementation, CLI entry, and test file
- [x] `pnpm --filter @rcf/judge test` passes (2/2 tests, single file green)
- [x] `pnpm --filter @rcf/judge build` (tsc) clean
- [x] Worktree has commit `46725cf` for Task 5
- [x] This report updated

## Concerns / handoff notes

1. **`pnpm-lock.yaml` was committed alongside `packages/judge`.** The brief's `git add packages/judge` was insufficient — `pnpm install` mutated the root lockfile. Including it pins zod / vitest / tsx versions for downstream `pnpm install --frozen-lockfile`. Same caveat Tasks 2–4 raised; if the project wants lockfile commits separated or owned by a bot, this is the place to do that.

2. **`@rcf/core` must be built before the judge tests run.** The package's `main` points to `./dist/index.js`; a fresh worktree (or a worktree that hasn't run `pnpm build` for core yet) will see vitest fail with `Failed to resolve entry for package "@rcf/core"`. The reproducer for downstream agents is:
   ```bash
   pnpm install --no-frozen-lockfile
   pnpm --filter @rcf/core build
   pnpm --filter @rcf/judge test
   ```
   This is documented in Task 3 / Task 4 reports; flagging again because the brief's first command doesn't mention it.

3. **`var/` lives under `process.cwd()` unless `RCF_VAR_DIR` is set.** Running `pnpm --filter @rcf/judge test` resolves `var/` to `packages/judge/var/`. The test's `setup()` helper and the judge itself both `mkdir` it on first use, so it works as-is, but a future orchestrator should `cd` to the repo root or set `RCF_VAR_DIR` so the artifact path is consistent across packages.

4. **`@rcf/core` should re-export the inferred `StoryPackage` / `ScoreReport` types.** Right now every consumer that uses the brief's `type X` pattern (`packages/heuristic/src/gate.ts`, `packages/heuristic/src/checks/*.ts`, `packages/judge/src/judge.ts`) fails `tsc`. The orchestrator should add `export type StoryPackage = z.infer<typeof StoryPackageSchema>;` to `packages/core/src/schemas/story.ts` and `export type ScoreReport = z.infer<typeof ScoreReportSchema>;` to `packages/core/src/schemas/score.ts` (and rebuild core), then drop the local `z.infer` aliases in `judge.ts` to restore the brief's verbatim import line. This is the one piece of out-of-scope cleanup that the judge fix was a workaround for. Not blocking — both `vitest` and `tsc` for `@rcf/judge` are GREEN today — but it would close the gap for the heuristic and any future package.

5. **`JudgeLlm.judge` ignores both `system` and `user`.** The stub returns a fixed `response` regardless of what's passed in. The production wiring will inject prompts; tests just want deterministic JSON. The factory's signature is intentionally one-arg for fixture brevity, which means a stub returning `JSON.stringify({...})` and the real LLM are interchangeable from `judge.ts`'s perspective. Fine for v1; if a future caller needs prompt-aware stubs (e.g. for "refuse to judge if no rubric version"), the `JudgeLlm` interface can grow a richer signature.

6. **`judgeSurvivors` is sequential.** One LLM call per survivor, awaited in a `for` loop. The `budgetMax` cap is a *cost* cap, not a *concurrency* cap. At the default 8, this is the right tradeoff for v1: the LLM is the slow leg, batching buys little, and serial keeps the score-report file writes from racing. If a future task needs higher throughput, swap to a bounded `Promise.all` map — the `ScoreReport` writes are keyed by `story_id` and a tiny per-id mutex would prevent clobbering.

7. **`RUBRIC_SYSTEM` and `RUBRIC_TEMPLATE` are exported but not yet snapshot-tested.** The brief's contract is that the rubric is a `judge-v1` frozen prompt; a real LLM judge is going to be sensitive to wording. Worth adding a tiny snapshot or hash test in a future task (or, at minimum, asserting `RUBRIC_VERSION === "judge-v1"` in some smoke check) so a future "let's tighten the prompt" PR doesn't silently shift judge behaviour across batches. Out of scope here.

## Reproduction

```bash
cd E:/dev/reddit-confession-factory/.worktrees/task-5-judge
pnpm install --no-frozen-lockfile    # 7.0s
pnpm --filter @rcf/core build        # 3.2s, populates packages/core/dist/
pnpm --filter @rcf/judge build       # 3.1s, populates packages/judge/dist/
pnpm --filter @rcf/judge test        # 3.4s, 2/2 passed
```
