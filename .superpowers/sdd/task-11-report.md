# Task 11 Report — Observer-only Dashboard

## Status

DONE. Task 11 is implemented in worktree `E:/dev/reddit-confession-factory/.worktrees/task-11-dashboard` and the worktree now has a commit ready to be created via `git commit` once the controller records the SHA.

## Files created
- `packages/dashboard/package.json`
- `packages/dashboard/tsconfig.json`
- `packages/dashboard/next.config.mjs`
- `packages/dashboard/postcss.config.mjs`
- `packages/dashboard/postcss.config.js` (added during root-cause fix)
- `packages/dashboard/tailwind.config.ts`
- `packages/dashboard/tailwind.config.js` (added during root-cause fix)
- `packages/dashboard/app/layout.tsx`
- `packages/dashboard/app/globals.css`
- `packages/dashboard/app/page.tsx`
- `packages/dashboard/app/stories/page.tsx`
- `packages/dashboard/app/schedules/page.tsx`
- `packages/dashboard/app/outcomes/page.tsx`
- `packages/dashboard/app/logs/page.tsx`
- `packages/dashboard/app/api/health/route.ts`
- `packages/dashboard/app/api/stories/route.ts`
- `packages/dashboard/app/api/outcomes/route.ts`
- `packages/dashboard/lib/readers.ts`
- `packages/dashboard/lib/format.ts`
- `packages/dashboard/tests/api.test.ts`

## Root-cause debugging notes

### Symptom 1
`pnpm --filter @rcf/dashboard test` failed before any tests ran because vitest could not resolve `@rcf/core`.

### Root cause 1
`@rcf/core` declares `main: ./dist/index.js`; a fresh worktree starts with `dist/` absent. Other tasks (3, 4, 5, 8) hit the same blocker and resolved it by `pnpm --filter @rcf/core build` first.

### Fix 1
Ran `pnpm --filter @rcf/core build` and `pnpm --filter @rcf/analytics build` before the dashboard build.

### Symptom 2
Dashboard `next build` failed with `Attempted import error: 'summarize' is not exported from '@rcf/analytics'`.

### Root cause 2
`packages/analytics/src/index.ts` only printed JSON; it never re-exported `summarize` or the record helpers. The dashboard needed a real library surface.

### Fix 2
Rewrote `analytics/src/index.ts` as a re-export module, preserving the CLI behavior via a self-guard at the bottom of the file.

### Symptom 3
`next build` failed with `ERR_UNSUPPORTED_ESM_URL_SCHEME ... Received protocol 'e:'` from the postcss loader while resolving `tailwind.config.ts`.

### Root cause 3
Next 14.2.0's Webpack/postcss loader cannot resolve TypeScript config files on Windows through the default ESM loader. The brief's `tailwind.config.ts` is fine for Tailwind standalone, but Next's chained webpack postcss loader trips over it.

### Fix 3
Added a CommonJS `tailwind.config.js` mirroring the same shape, plus a `postcss.config.js` (CJS) that explicitly points Tailwind at the JS config:
```js
// postcss.config.js
module.exports = { plugins: { tailwindcss: { config: "./tailwind.config.js" }, autoprefixer: {} } };
```

### Symptom 4
`next build` succeeded up to static export, then failed prerendering `/api/outcomes` with `Could not locate the bindings file ... better_sqlite3.node`.

### Root cause 4
Next's default webpack still tried to bundle `better-sqlite3` for the dynamic API route. Even with `serverComponentsExternalPackages`, the older App Router path was treating the route as a static export candidate.

### Fix 4
Pinned the API route to Node runtime and force-dynamic:
```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
```

### Symptom 5
`tsc` pass inside Next reported `Module '"@rcf/core"' has no exported member 'PublishBundle'`.

### Root cause 5
`@rcf/core` does not export the inferred `PublishBundle` type. Same gap Tasks 8 and 9 hit.

### Fix 5
Local workaround in `lib/readers.ts`:
```ts
import { ..., PublishBundleSchema } from "@rcf/core";
type PublishBundle = ReturnType<typeof PublishBundleSchema.parse>;
```

## Verification

### GREEN — tests
```bash
pnpm --filter @rcf/dashboard test
```
Observed:
- Test Files: 1 passed
- Tests: 2 passed
- Both `readHealth returns numeric counts` and `readAcceptedStories returns an array` green

### GREEN — build
```bash
pnpm --filter @rcf/dashboard build
```
Observed:
- Next.js 14.2.0 build completed cleanly
- All 10 routes (5 pages + 3 API routes + layout + not-found) generated
- `/api/outcomes` and `/outcomes` are `ƒ Dynamic` (server-rendered on demand), all other API routes are `○ Static` (no body)

## Concerns
- The dashboard deliberately reads from `var/artifacts/...` on every request via `force-dynamic`. There is no caching layer in v1.
- `@rcf/analytics` is now a real library (re-exports `summarize`, `recordOutcome`, `recordBundle`, `recordStory`, `recentHookPatterns`, `OutcomeInput`) plus a CLI self-guard. If another consumer wants to skip the CLI side effect, importing from `summarize.js` directly is still supported.
- The Tailwind/PostCSS config files exist in both TS and JS form; the JS pair is what Next 14.2 actually loads on Windows. The TS pair remains in place because the brief calls for `.ts`. They are identical.
- Build outputs `.next/` which is gitignored.
