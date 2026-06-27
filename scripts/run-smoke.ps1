Set-Location "E:\dev\reddit-confession-factory"
$env:RCF_VAR_DIR = "E:\dev\reddit-confession-factory\var"

# Clean old stories/scores/renders so the smoke story is the only input
Remove-Item "E:\dev\reddit-confession-factory\var\artifacts\stories\s_mqwefz5*" -ErrorAction SilentlyContinue
Remove-Item "E:\dev\reddit-confession-factory\var\artifacts\render\s_mqwefz5*" -ErrorAction SilentlyContinue
Remove-Item "E:\dev\reddit-confession-factory\var\artifacts\scores\s_mqwefz5*" -ErrorAction SilentlyContinue

# Stage the smoke story (same content as scripts/smoke.sh heredoc)
$storyPath = "E:\dev\reddit-confession-factory\var\artifacts\stories\s_smoke0001.json"
New-Item -ItemType Directory -Path "E:\dev\reddit-confession-factory\var\artifacts\stories" -Force | Out-Null
$smokeJson = @'
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
'@
Set-Content -Path $storyPath -Value $smokeJson
Write-Host "Smoke story staged."

Write-Host "--- heuristic ---"
pnpm --filter @rcf/heuristic start 2>&1 | Select-Object -Last 3

Write-Host "--- judge ---"
$env:RCF_JUDGE_BUDGET = "1"
pnpm --filter @rcf/judge start 2>&1 | Select-Object -Last 3

Write-Host "--- formatter ---"
pnpm --filter @rcf/formatter start 2>&1 | Select-Object -Last 3

$scorePath = "E:\dev\reddit-confession-factory\var\artifacts\scores\s_smoke0001.json"
$renderTiktok = "E:\dev\reddit-confession-factory\var\artifacts\render\s_smoke0001_tiktok_reels.json"
$renderShorts = "E:\dev\reddit-confession-factory\var\artifacts\render\s_smoke0001_youtube_shorts.json"
Write-Host "--- outputs ---"
if (Test-Path $scorePath) { Write-Host "score: OK" } else { Write-Host "score: MISSING" }
if (Test-Path $renderTiktok) { Write-Host "render tiktok: OK" } else { Write-Host "render tiktok: MISSING" }
if (Test-Path $renderShorts) { Write-Host "render shorts: OK" } else { Write-Host "render shorts: MISSING" }

Write-Host "--- score decision ---"
if (Test-Path $scorePath) {
    $score = Get-Content $scorePath | ConvertFrom-Json
    Write-Host "accept_decision: $($score.accept_decision)"
    if ($score.reject_reasons.Count -gt 0) {
        Write-Host "reject_reasons: $($score.reject_reasons -join '; ')"
    }
}

Write-Host "smoke: done"
