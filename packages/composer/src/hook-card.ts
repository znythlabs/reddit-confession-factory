import type { StoryPackage } from "@rcf/core";

export const renderHookCardHtml = (story: StoryPackage): string => `
<!doctype html>
<html><head><meta charset="utf-8"><style>
  body { margin:0; font-family: -apple-system, Inter, sans-serif; background:#0e0d0c; color:#f3eee5; }
  .card { padding: 32px 24px; border-left: 4px solid #b1351f; background:#1a1714; }
  .meta { font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color:#a89c8a; margin-bottom: 12px; }
  .handle { color:#d8c8a8; }
  .time { color:#7a7468; margin-left: 8px; }
  .title { font-size: 22px; font-weight: 600; line-height: 1.25; }
  .community { color:#a89c8a; font-size: 13px; margin-top: 6px; }
</style></head>
<body>
  <div class="card">
    <div class="meta">
      <span class="handle">${story.forum_card.fictional_handle}</span>
      <span class="time">${story.forum_card.relative_time_label}</span>
    </div>
    <div class="title">${story.forum_card.display_title}</div>
    <div class="community">${story.forum_card.fictional_community_label}</div>
  </div>
</body></html>`.trim();
