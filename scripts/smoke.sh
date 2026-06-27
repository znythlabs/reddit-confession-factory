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
  "premise": "A late-night confession about the wrong apartment key from a fictional superintendent.",
  "hook": "I should not have used the lobby key that third late night shift at all.",
  "forum_card": {
    "display_title": "Confession: wrong key",
    "fictional_handle": "throwaway_lobby",
    "fictional_community_label": "confessions",
    "relative_time_label": "2 hours ago",
    "style_variant": "dark-card"
  },
  "confession_voice": "first-person",
  "story_blocks": [
    { "index": 0, "text": "The lobby key felt wrong in my hand when I lifted it from the rack.", "suggested_duration_s": 9 },
    { "index": 1, "text": "I turned it anyway because the tenants were waiting inside the building.", "suggested_duration_s": 8 },
    { "index": 2, "text": "The door opened into the wrong hallway of the wrong building entirely.", "suggested_duration_s": 9 },
    { "index": 3, "text": "I walked a few steps before I noticed my own name on the mailbox downstairs.", "suggested_duration_s": 9 },
    { "index": 4, "text": "It was my building. It had always been my building for twenty quiet years.", "suggested_duration_s": 10 }
  ],
  "twist": "It was my building. It had always been my building and I had forgotten the shape of home.",
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
