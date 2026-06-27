# Task 4 Report — Heuristic Gate role (with no-forgery hard-fail)

## Status

**DONE.** All 16 files from the brief created, tests pass (6/6), commit landed on `task-4-heuristic`.

## Commit

- Branch: `task-4-heuristic`
- Hash: `95bedb0361f80a717e6348cb285d03c362d7fdc9`
- Message: `feat(heuristic): gate + no-forgery checks with fixtures`
- 18 files changed, 345 insertions(+), 0 deletions(-)
  - 17 files under `packages/heuristic/`
  - 1 root `pnpm-lock.yaml` (required by `pnpm install`)

## Files created

| Path | Purpose |
| --- | --- |
| `packages/heuristic/package.json` | manifest (`@rcf/core` workspace dep, tsx/vitest/typescript devDeps) |
| `packages/heuristic/tsconfig.json` | extends root `tsconfig.base.json`, outDir `dist` |
| `packages/heuristic/src/index.ts` | CLI: scans `paths.storiesDir()` and runs the gate on every JSON |
| `packages/heuristic/src/gate.ts` | `runHeuristicGate(story): Promise<ScoreReport>`, persists via `paths.scoreJson(id)` |
| `packages/heuristic/src/no-forgery.ts` | hard-fail module: forbidden fields, real subreddit names, impersonation patterns |
| `packages/heuristic/src/checks/runtime-fit.ts` | total `suggested_duration_s` ∈ [15, 90] |
| `packages/heuristic/src/checks/hook-length.ts` | `hook.length` ∈ [12, 110] |
| `packages/heuristic/src/checks/cadence.ts` | ≥3 blocks, ≥2 distinct rounded durations |
| `packages/heuristic/src/checks/duplicate.ts` | scans `paths.storiesDir()` for matching `freshness_fingerprint` |
| `packages/heuristic/src/checks/banned-endings.ts` | rejects `and then i woke up`, `it was all a dream`, `the end.` |
| `packages/heuristic/src/checks/readability.ts` | avg sentence length ≤ 140 |
| `packages/heuristic/src/checks/structure.ts` | premise/twist non-empty, ≥2 blocks, contiguous `index` |
| `packages/heuristic/tests/fixtures/valid-story.json` | clean fixture (3 blocks, 15s total) — should accept |
| `packages/heuristic/tests/fixtures/forged-votes.json` | `votes`/`comments`/`karma` injected — should hard-fail |
| `packages/heuristic/tests/fixtures/real-subreddit.json` | `fictional_community_label = "r/askreddit"` — should hard-fail |
| `packages/heuristic/tests/gate.test.ts` | 3 cases: clean accept, forged reject, real-sub reject |
| `packages/heuristic/tests/no-forgery.test.ts` | 3 cases: clean pass, forged hit, real-sub hit |
| root `pnpm-lock.yaml` | lockfile refreshed for the new workspace package |

## Compile-level fixes applied to the brief code

The brief allowed compile-level fixes. One was strictly necessary.

### `as any` → `StoryPackageSchema.parse` / `as unknown as StoryPackage`

The brief's test files cast JSON imports with `as any` to push them into `runHeuristicGate(story: StoryPackage)`. A project rule (`ts-no-any`) prohibits `any` at the type boundary; the brief explicitly permits "a compile-level fix strictly necessary". The proper boundary check for external JSON is a schema parse.

Fix, per test file:

- **Valid fixture** — fully schema-conformant; parsed through `StoryPackageSchema.parse(validJson)` to get a typed `StoryPackage`. This is the correct boundary check for trusted-at-write-time JSON.
- **Forged / real-subreddit fixtures** — intentionally violate `StoryPackageSchema` (forbidden `votes`/`comments`/`karma` keys, or `r/askreddit` in a string field the schema would otherwise accept). A schema parse would either strip the extra keys (default Zod behaviour) or reject the input, defeating the test's purpose. Cast through `unknown` with an inline reason:

  ```ts
  // Forged/real-subreddit fixtures intentionally violate StoryPackageSchema; cast through unknown.
  const forged = forgedJson as unknown as StoryPackage;
  ```

  This is `as unknown as T` per the rule — the comment names the boundary and the reason (intentional schema violation for the no-forgery test surface).

No source files required changes; all `as any` in the brief lived in the test files.

## Test evidence (RED → GREEN)

### Blocker 1: outdated `pnpm-lock.yaml`

The brief's first command failed with:

```
ERR_PNPM_OUTDATED_LOCKFILE  Cannot install with "frozen-lockfile" because
pnpm-lock.yaml is not up to date with packages\heuristic\package.json
specifiers in the lockfile ({}) don't match specs in package.json
({"tsx":"^4.7.0","typescript":"^5.4.0","vitest":"^1.6.0","@rcf/core":"workspace:*"})
```

Resolution: `pnpm install --no-frozen-lockfile` at the root. Added 82 packages (tsx, vitest deps, esbuild, etc.). Same blocker Task 3 already documented; expected when introducing a new workspace package.

### Blocker 2: `@rcf/core` not built

`@rcf/core` declares `"main": "./dist/index.js"` but `dist/` was never produced in this worktree. `@rcf/heuristic` resolves the dependency and `gate.ts` / `no-forgery.ts` / `index.ts` all import from it. Without `dist/`, vitest fails to resolve the package entry the same way Task 3's report described.

Resolution: `pnpm --filter @rcf/core build` (clean, no output, exits 0). Task 3 already added `@types/node` to the root and built core once, but a fresh worktree starts with `dist/` absent. Building once is sufficient; `dist/` is gitignored.

### GREEN — test run

```
$ pnpm --filter @rcf/heuristic test
> @rcf/heuristic@0.0.0 test E:\dev\reddit-confession-factory\.worktrees\task-4-heuristic\packages\heuristic
> vitest run

 RUN  v1.6.1 E:/dev/reddit-confession-factory/.worktrees/task-4-heuristic/packages/heuristic

 Test Files  2 passed (2)
      Tests  6 passed (6)
   Start at  04:00:23
   Duration  794ms (transform 200ms, setup 0ms, collect 362ms, tests 12ms,
                 environment 0ms, prepare 448ms)
```

Six tests pass on the first run after the two blockers above — three in `gate.test.ts` (clean accept, forged reject with `forbidden field` reason, real-sub reject with `real subreddit` reason) and three in `no-forgery.test.ts` (clean pass with empty hits, forged `votes` hit, real-sub `real subreddit` hit).

### GREEN — `tsc` build

```
$ pnpm --filter @rcf/heuristic build
> @rcf/heuristic@0.0.0 build E:\dev\reddit-confession-factory\.worktrees\task-4-heuristic\packages\heuristic
> tsc
(no output — clean compile)
```

`dist/` populated with `index.js`, `gate.js`, `no-forgery.js`, and `checks/*.js`.

## Acceptance check

- [x] `packages/heuristic` contains the manifest, tsconfig, all 7 checks, no-forgery module, gate, CLI entry, 3 fixtures, 2 test files
- [x] `pnpm --filter @rcf/heuristic test` passes (6/6 tests, both files green)
- [x] Worktree has commit `95bedb0` for Task 4
- [x] `tsc` build clean
- [x] This report updated

## Concerns / handoff notes

1. **`pnpm-lock.yaml` was committed alongside `packages/heuristic`** — the brief's `git add packages/heuristic` line was insufficient; the lockfile update is included so future `pnpm install --frozen-lockfile` runs succeed. Same caveat Task 3 raised.
2. **No-forgery is a separate module, not a check** — the brief treats it as a hard-fail that runs *before* the heuristic checks and whose hits are appended to `reject_reasons`. `gate.ts` runs `noForgery` synchronously, then `Promise.all` on the seven checks, then `forgery.pass && checks.every(...)` decides `accept_decision`. This is the right shape: a hard-fail should not be hidden inside a soft check list. Task 5 (LLM judge) should add its own gate step but reuse the same `ScoreReport.reject_reasons` convention.
3. **`duplicate` reads `paths.storiesDir()` from `process.cwd()`** — the `paths` module uses `RCF_VAR_DIR ?? path.resolve(process.cwd(), "var")`. Running `pnpm --filter @rcf/heuristic test` lands in `packages/heuristic/`, so the `duplicate` check sees `packages/heuristic/var/artifacts/stories/` (empty), and the try/catch swallows any ENOENT. Fine for tests; under real use, set `RCF_VAR_DIR` or run from repo root.
4. **The CLI entry (`src/index.ts`) re-reads stories from disk on every invocation** — no in-process dedup, no parallelism. Fine for v1 batch use; the dashboard / orchestrator (future task) owns the loop and should call `runHeuristicGate` directly, bypassing the CLI.
5. **`readability` has a degenerate edge case** — when the haystack splits into zero non-empty sentences (no `.`, `!`, or `?`), `avgSentenceLen` returns 999, which fails the ≤140 check. The result is a hard reject, which is the safer default; if a future fixture trips this, the fix is one line.
6. **`bannedEndings` checks the twist plus all block text** — the `hit.source` (e.g. `/the end\./i`) is the raw regex source string, not a human-readable reason. `gate.ts` interpolates it directly into `reject_reasons`. Acceptable for the brief; if a dashboard surfaces these, a friendlier label would help. Out of scope for v1.
7. **`freshness_fingerprint` collision tolerance** — `duplicate` compares 16-hex-char fingerprints, which is a 64-bit content hash. The fixture uses hand-picked unique values; under real generation, `hashFreshness` from `@rcf/generator` is the producer and collisions are astronomically unlikely at v1 volume. If Task 3's note 4 (time-component hashing) lands, this check should follow.
8. **No `tsconfig` extends restriction** — the `tsconfig.json` extends `../../tsconfig.base.json` like the other packages, includes `src` only. Tests use the same `import ... assert { type: "json" }` syntax the brief specified; vitest's esbuild loader handles it without a tsconfig change.
