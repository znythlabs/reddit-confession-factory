#!/usr/bin/env bash
set -euo pipefail
mkdir -p var/artifacts/stories var/artifacts/scores var/artifacts/render var/artifacts/bundles var/logs
pnpm install
echo "RCF workspace initialized."
