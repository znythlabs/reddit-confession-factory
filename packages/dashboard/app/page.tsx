import "../lib/env";
import { readHealth } from "../lib/readers";
import { RunBatchButton } from "./RunBatchButton";

export const dynamic = "force-dynamic";

const stages = [
  { key: "generated", label: "Generated", desc: "Stories in queue" },
  { key: "scores", label: "Scored", desc: "Heuristic reports" },
  { key: "accepted", label: "Accepted", desc: "Cleared the gate" },
  { key: "renderPackages", label: "Render Packages", desc: "Format-ready JSON" },
  { key: "mp4Renders", label: "MP4 Renders", desc: "Actual video files" },
  { key: "bundles", label: "Bundles", desc: "Exported" },
  { key: "missingMp4s", label: "Missing MP4s", desc: "Render pkg w/o video" },
  { key: "rejected", label: "Rejected", desc: "Gate failures" },
] as const;

type HealthKey = (typeof stages)[number]["key"];

export default async function Page() {
  const h = await readHealth();

  const flow = [
    { label: "Generated", count: h.generated },
    { label: "Scored", count: h.scores },
    { label: "Accepted", count: h.accepted },
    { label: "Render Packages", count: h.renderPackages },
    { label: "MP4 Renders", count: h.mp4Renders },
    { label: "Bundles", count: h.bundles },
  ];

  const mp4Missing = h.renderPackages > 0 && h.mp4Renders === 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-parchment tracking-tight">Pipeline Overview</h1>
        <p className="text-sm text-parchment-muted mt-1">
          Observer console for the Confession Factory batch pipeline.
        </p>
      </header>

      {/* Today's Batch hero */}
      <section className="rcf-card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="rcf-label">Today&apos;s Batch</div>
            <div className="text-lg font-semibold text-parchment mt-1">Live Pipeline</div>
          </div>
          <div className={mp4Missing ? "rcf-pill-reject" : "rcf-pill-ok"}>
            <span
              className={
                "w-1.5 h-1.5 rounded-full " + (mp4Missing ? "bg-danger" : "bg-success")
              }
            />
            <span>{mp4Missing ? "incomplete" : "Observer"}</span>
          </div>
        </div>

        <div className="flex items-stretch gap-2 overflow-x-auto">
          {flow.map((s, i) => (
            <div key={s.label} className="flex-1 flex items-center gap-2 min-w-0">
              <div className="flex-1 bg-panel-soft border border-white/5 rounded-md px-3 py-3 min-w-0">
                <div className="rcf-label truncate">{s.label}</div>
                <div className="text-2xl font-semibold text-parchment mt-1 font-mono tabular-nums">
                  {s.count}
                </div>
              </div>
              {i < flow.length - 1 && (
                <div className="text-ink-muted text-lg select-none shrink-0" aria-hidden>
                  &rarr;
                </div>
              )}
            </div>
          ))}
        </div>

        {mp4Missing && (
          <div className="mt-4 flex items-start gap-2 text-xs text-warning">
            <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1 shrink-0" />
            <span>
              Render packages exist, but no MP4 files were found. Composer/HyperFrames may not have
              rendered videos yet.
            </span>
          </div>
        )}

        {h.rejected > 0 && (
          <div className="mt-3 flex items-center gap-2 text-xs text-danger">
            <span className="w-1.5 h-1.5 rounded-full bg-danger" />
            <span>
              {h.rejected} {h.rejected === 1 ? "story" : "stories"} rejected at the heuristic gate
            </span>
          </div>
        )}
      </section>

      {/* Stage cards */}
      <section>
        <div className="rcf-label mb-3">Stages</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stages.map((s) => {
            const value = h[s.key as HealthKey];
            const warn = s.key === "missingMp4s" && value > 0;
            return (
              <div
                key={s.key}
                className={
                  "rcf-card p-4 " + (warn ? "border-warning/30" : "")
                }
              >
                <div className="rcf-label">{s.label}</div>
                <div
                  className={
                    "text-3xl font-semibold mt-2 font-mono tabular-nums " +
                    (warn ? "text-warning" : "text-parchment")
                  }
                >
                  {value}
                </div>
                <div className="text-[11px] text-ink-muted mt-1">{s.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      <RunBatchButton />
    </div>
  );
}
