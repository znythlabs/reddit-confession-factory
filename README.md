# Reddit-Style Confession Story Factory (RCF)

Fiction-first faceless short-video pipeline for TikTok, Reels, Shorts.

See `docs/superpowers/specs/2026-06-26-reddit-confession-factory-design.md` for the full design.

## Quick start

```bash
pnpm install
pnpm doctor
pnpm --filter @rcf/orchestrator build
pnpm batch           # one daily batch
```

## Layout

- `packages/*` — one role per package
- `var/artifacts/*` — runtime artifacts
- `packages/dashboard` — observer-only ops console
