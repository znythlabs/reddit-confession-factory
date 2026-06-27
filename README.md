# Reddit-Style Confession Story Factory (RCF)

Fiction-first faceless short-video pipeline for TikTok, Reels, Shorts.

Spec: `docs/superpowers/specs/2026-06-26-reddit-confession-factory-design.md`
Plan: `docs/superpowers/plans/2026-06-26-reddit-confession-factory.md`

## Quick start

```bash
pnpm install
pnpm doctor
pnpm test            # all packages
pnpm smoke           # end-to-end pipeline with a stub story
pnpm --filter @rcf/dashboard dev   # observer console on http://localhost:3001
pnpm --filter @rcf/orchestrator start  # daily scheduler
```

## Roles (subagent aliases)

| Role | Package | Responsibility |
|---|---|---|
| Story Generator | `@rcf/generator` | LLM-authored fictional story candidates |
| Heuristic Gate | `@rcf/heuristic` | Deterministic accept/reject + no-forgery hard-fail |
| LLM Story Judge | `@rcf/judge` | Batch-budgeted quality scoring |
| Script Formatter | `@rcf/formatter` | Scene plan + per-platform pacing |
| Visual Composer | `@rcf/composer` | HyperFrames render + TTS + BGM |
| Export / Publisher | `@rcf/exporter` | Per-platform publish bundles |
| Analytics Tracker | `@rcf/analytics` | SQLite outcomes + breakdowns |

## Guardrails (non-negotiable)

- Fiction-first: never claim real Reddit provenance.
- Forum-inspired hook card only. No fabricated engagement metrics, no real subreddit names, no impersonating usernames.
- No direct platform posting in v1. Export-only.
- Dashboard is observer-only. No approve/reject in v1.
- No model fine-tuning. Analytics drive prompt/seed selection.
- Hybrid scoring always. LLM judge runs only on heuristic survivors, batch-budgeted.

## Artifacts

`var/artifacts/stories|scores|render|bundles/<id>.json` and `var/analytics.sqlite`. The dashboard reads from these. No background daemons are required for the dashboard to function — it reads on each request.
