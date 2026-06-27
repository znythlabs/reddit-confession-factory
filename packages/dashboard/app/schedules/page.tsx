import { readAcceptedStories, readBundles } from "../../lib/readers";
import type { PublishBundle } from "@rcf/core";

export const dynamic = "force-dynamic";

const platformOrder = ["tiktok", "instagram_reels", "youtube_shorts"] as const;
const platformLabel: Record<(typeof platformOrder)[number], string> = {
  tiktok: "TikTok",
  instagram_reels: "Instagram Reels",
  youtube_shorts: "YouTube Shorts",
};

const statusPill = (status: string) => {
  const s = status.toLowerCase();
  if (s === "ready") return "rcf-pill-ok";
  if (s === "draft") return "rcf-pill-pending";
  if (s === "rejected" || s === "failed") return "rcf-pill-reject";
  if (s === "pending" || s === "running") return "rcf-pill-running";
  return "rcf-pill-pending";
};

export default async function Page() {
  const [accepted, bundles] = await Promise.all([readAcceptedStories(), readBundles()]);

  // Group bundles by story_id
  const bundlesByStory = new Map<string, PublishBundle[]>();
  for (const b of bundles) {
    const list = bundlesByStory.get(b.story_id);
    if (list) list.push(b);
    else bundlesByStory.set(b.story_id, [b]);
  }

  // Export queue = every accepted story, with its bundles (may be empty)
  const queue = accepted.map(({ story }) => ({
    storyId: story.story_id,
    bundles: bundlesByStory.get(story.story_id) ?? [],
  }));

  const missing = queue.filter((q) => q.bundles.length === 0).length;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-parchment tracking-tight">Export Queue</h1>
          <p className="text-sm text-parchment-muted mt-1">
            Accepted stories queued for per-platform bundle export. Observer only — no platform posting.
          </p>
        </div>
        <div className="text-right">
          <div className="rcf-label">Stories</div>
          <div className="text-2xl font-semibold text-parchment font-mono tabular-nums">
            {queue.length}
          </div>
        </div>
      </header>

      {queue.length === 0 ? (
        <div className="rcf-card p-8 text-center">
          <div className="text-parchment-muted text-sm">Export queue is empty</div>
          <div className="text-ink-muted text-xs mt-1">
            Accepted stories appear here once a batch runs.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {missing > 0 && (
            <div className="flex items-start gap-2 text-xs text-warning">
              <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1 shrink-0" />
              <span>
                {missing} {missing === 1 ? "story has" : "stories have"} no bundles yet — waiting for MP4
                render.
              </span>
            </div>
          )}

          {queue.map(({ storyId, bundles: items }) => {
            const byPlatform = new Map(items.map((b) => [b.platform, b]));
            const waiting = items.length === 0;
            return (
              <article key={storyId} className="rcf-card p-4">
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <div className="rcf-label">Story</div>
                    <div className="text-sm font-mono text-parchment mt-0.5">{storyId}</div>
                  </div>
                  <div className="h-8 w-px bg-white/5" />
                  <div className="flex items-center gap-2 flex-wrap flex-1">
                    {waiting ? (
                      <span className="rcf-pill-pending text-[11px]">
                        Waiting for MP4 render
                      </span>
                    ) : (
                      platformOrder.map((p) => {
                        const bundle = byPlatform.get(p);
                        return (
                          <div
                            key={p}
                            className="flex items-center gap-1.5 bg-panel-soft border border-white/5 rounded-md px-2.5 py-1.5"
                          >
                            <span className="text-[11px] text-parchment-muted">
                              {platformLabel[p]}
                            </span>
                            <span className={statusPill(bundle!.status)}>{bundle!.status}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
