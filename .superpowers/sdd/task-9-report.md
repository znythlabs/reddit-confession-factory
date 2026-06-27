# Task 9 Report — Analytics Tracker role

## Status

DONE. Task 9 is implemented in worktree `E:/dev/reddit-confession-factory/.worktrees/task-9-analytics` with commit `6800bf0` (`feat(analytics): sqlite-backed outcomes + breakdowns`).

## Files created
- `packages/analytics/package.json`
- `packages/analytics/tsconfig.json`
- `packages/analytics/src/db.ts`
- `packages/analytics/src/record.ts`
- `packages/analytics/src/summarize.ts`
- `packages/analytics/src/freshness.ts`
- `packages/analytics/src/index.ts`
- `packages/analytics/tests/record.test.ts`
- `packages/analytics/tests/summarize.test.ts`

## Root-cause debugging notes

### Symptom 1
Initial `pnpm --filter @rcf/analytics test` failed before any tests ran with esbuild service crashes.

### Root cause 1
The worktree had an esbuild host/binary mismatch (`0.21.5` host vs `0.28.1` binary) in its local install graph. This was environmental, not source-level.

### Fix 1
Reinstalled the worktree dependencies with:
```bash
pnpm install --force --no-frozen-lockfile
```

### Symptom 2
After the reinstall, analytics tests ran but failed with stale row counts (`expected 2 to be 1`, then `expected 3 to be 1`).

### Root cause 2
`packages/core/src/paths.ts` cached `RCF_VAR_DIR` once at module import time:
```ts
const varDir = process.env.RCF_VAR_DIR ?? path.resolve(process.cwd(), "var");
```
The analytics tests change `process.env.RCF_VAR_DIR` in `beforeEach`, but `paths` never re-read it, so all suites shared the same SQLite file. Fixing `db.ts` caching alone was insufficient because the upstream `paths` object kept pointing at the original directory.

### Exact fix 2
Made `@rcf/core` path resolution dynamic per call:
```ts
const getVarDir = () => process.env.RCF_VAR_DIR ?? path.resolve(process.cwd(), "var");

export const paths = {
  get root() {
    return getVarDir();
  },
  storiesDir: () => path.join(getVarDir(), "artifacts", "stories"),
  ...
};
```
This is the real source fix because every package routes through `paths`.

### Additional scoped compile fix
`packages/analytics/src/record.ts` could not import `type PublishBundle` from `@rcf/core` because that type is not exported there. To keep the fix scoped to Task 9, I changed it to:
```ts
type PublishBundle = ReturnType<typeof PublishBundleSchema.parse>;
```

## Verification

### GREEN — dependency repair + core build
```bash
pnpm install --force --no-frozen-lockfile
pnpm --filter @rcf/core build
```
Observed:
- install succeeded
- core built cleanly

### GREEN — tests
```bash
pnpm --filter @rcf/analytics test
```
Observed:
- Test Files: 2 passed
- Tests: 2 passed
- `record.test.ts` green
- `summarize.test.ts` green

### GREEN — build
```bash
pnpm --filter @rcf/analytics build
```
Observed:
- `tsc` completed with no diagnostics.

### GREEN — commit
```bash
git add packages/analytics packages/core/src/paths.ts pnpm-lock.yaml
git commit -m "feat(analytics): sqlite-backed outcomes + breakdowns"
```
Observed:
- Commit `6800bf0`

## Concerns
- This task necessarily touched `packages/core/src/paths.ts` because the real bug lived there; keeping the fix inside analytics would have left every sibling package using stale env-resolved paths.
- `better-sqlite3` installed cleanly after the dependency repair and loaded successfully on this machine.
- CRLF warnings on commit are Windows working-copy normalization only.
