#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export RCF_VAR_DIR="${RCF_VAR_DIR:-$ROOT/var}"

mkdir -p "$RCF_VAR_DIR/artifacts/stories" "$RCF_VAR_DIR/artifacts/scores"
STORY_PATH="$RCF_VAR_DIR/artifacts/stories/s_smoke0001.json"
SCORE_PATH="$RCF_VAR_DIR/artifacts/scores/s_smoke0001.json"
RENDER_DIR="$RCF_VAR_DIR/artifacts/render"

cat > "$STORY_PATH" <<'JSON'
{
  "story_id": "s_smoke0001",
  "created_at": "2026-06-26T00:00:00.000Z",
  "premise": "A late-night confession about the wrong apartment key.",
  "hook": "I should not have used the lobby key that night.",
  "forum_card": {
    "display_title": "Confession: wrong key",
    "fictional_handle": "throwaway_lobby",
    "fictional_community_label": "confessions",
    "relative_time_label": "2 hours ago",
    "style_variant": "dark-card"
  },
  "confession_voice": "first-person",
  "story_blocks": [
    { "index": 0, "text": "The lobby key felt wrong in my hand.", "suggested_duration_s": 6 },
    { "index": 1, "text": "I turned it anyway.", "suggested_duration_s": 3 },
    { "index": 2, "text": "The door opened into the wrong building.", "suggested_duration_s": 7 }
  ],
  "twist": "It was my building. It had always been my building.",
  "ending_mode": "twist",
  "tone": "unsettling",
  "intensity": "medium",
  "background_mood": "dark-hallway",
  "music_mood": "low-tension",
  "tts_voice": "am_michael",
  "cta": "comment-your-take",
  "platform_variants": { "tiktok_reels": { "pacing": "fast" }, "youtube_shorts": { "pacing": "medium" } },
  "generation_prompt_version": "v1",
  "freshness_fingerprint": "a1a1a1a1a1a1a1a1"
}
JSON

pnpm -C "$ROOT" --filter @rcf/heuristic start
RCF_JUDGE_BUDGET=1 pnpm -C "$ROOT" --filter @rcf/judge start
pnpm -C "$ROOT" --filter @rcf/formatter start

test -s "$SCORE_PATH" || { echo "smoke: missing score"; exit 1; }
test -s "$RENDER_DIR/s_smoke0001_tiktok_reels.json" || { echo "smoke: missing tiktok render pkg"; exit 1; }
test -s "$RENDER_DIR/s_smoke0001_youtube_shorts.json" || { echo "smoke: missing shorts render pkg"; exit 1; }

echo "smoke: ok"
