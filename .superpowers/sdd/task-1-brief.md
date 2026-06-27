# Task 1: Bootstrap the workspace

## Files
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `README.md`
- Create: `scripts/init.sh`
- Create: `scripts/doctor.sh`

## Interfaces
- Produce: `pnpm-workspace.yaml` listing `packages/*`
- Produce: `tsconfig.base.json` consumed by every package

## Required steps

1. Write `package.json` with:
```json
{
  "name": "rcf",
  "private": true,
  "version": "0.0.0",
  "packageManager": "pnpm@9.0.0",
  "scripts": {
    "init": "bash scripts/init.sh",
    "doctor": "bash scripts/doctor.sh",
    "test": "pnpm -r --parallel test",
    "build": "pnpm -r build"
  }
}
```

2. Write `pnpm-workspace.yaml` with:
```yaml
packages:
  - "packages/*"
```

3. Write `tsconfig.base.json` with:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "incremental": true
  }
}
```

4. Write `.gitignore` with:
```text
node_modules/
dist/
.next/
var/
*.tsbuildinfo
.env
.env.local
```

5. Write `README.md` with:
```markdown
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
```

6. Write `scripts/init.sh` with:
```bash
#!/usr/bin/env bash
set -euo pipefail
mkdir -p var/artifacts/stories var/artifacts/scores var/artifacts/render var/artifacts/bundles var/logs
pnpm install
echo "RCF workspace initialized."
```

7. Write `scripts/doctor.sh` with:
```bash
#!/usr/bin/env bash
set -euo pipefail
command -v node  >/dev/null || { echo "missing: node"; exit 1; }
command -v pnpm  >/dev/null || { echo "missing: pnpm"; exit 1; }
command -v npx   >/dev/null || { echo "missing: npx"; exit 1; }
node -v | grep -qE '^v20\.' || { echo "node must be 20.x"; exit 1; }
echo "doctor: ok"
```

8. Run:
```bash
bash scripts/init.sh && bash scripts/doctor.sh
```
Expected output: `RCF workspace initialized.` then `doctor: ok`

9. Commit with:
```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .gitignore README.md scripts/
git commit -m "chore: bootstrap RCF workspace"
```

## TDD / quality requirements
- Follow TDD for any behavior-bearing code. For this task, any script logic should still be verified by running the required command in step 8.
- Do not add any files beyond the 7 listed.
- Keep the workspace bootstrap minimal; no extra tooling, configs, or packages.
