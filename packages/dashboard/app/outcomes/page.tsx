import { summarize } from "@rcf/analytics";

export const dynamic = "force-dynamic";

const groups = [
  ["By tone", "byTone"] as const,
  ["By twist", "byTwist"] as const,
  ["By background", "byBackground"] as const,
  ["By voice", "byVoice"] as const,
];

export default async function Page() {
  const s = summarize();

  const allRows = [...s.byTone, ...s.byTwist, ...s.byBackground, ...s.byVoice];
  const totalN = allRows.reduce((a, r) => a + r.n, 0);
  const empty = totalN === 0;

  const weightedCompletion = empty
    ? 0
    : allRows.reduce((a, r) => a + r.avg_completion * r.n, 0) / totalN;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-parchment tracking-tight">Outcomes</h1>
        <p className="text-sm text-parchment-muted mt-1">
          Aggregate completion metrics across accepted batches.
        </p>
      </header>

      {/* Summary hero — empty state or data */}
      <section className="rcf-card p-6">
        {empty ? (
          <div className="text-center py-2">
            <div className="text-parchment font-medium text-sm">
              No outcome metrics yet
            </div>
            <div className="text-parchment-muted text-xs mt-1.5 max-w-md mx-auto leading-relaxed">
              Record published video metrics to populate this page.
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <div className="rcf-label">Overall Completion</div>
              <div className="text-4xl font-semibold text-parchment mt-2 font-mono tabular-nums">
                {Math.round(weightedCompletion * 100)}
                <span className="text-parchment-muted text-2xl">%</span>
              </div>
            </div>
            <div>
              <div className="rcf-label">Sample Size</div>
              <div className="text-4xl font-semibold text-parchment mt-2 font-mono tabular-nums">
                {totalN}
              </div>
              <div className="text-[11px] text-ink-muted mt-1">across all groupings</div>
            </div>
            <div>
              <div className="rcf-label">Groupings</div>
              <div className="text-4xl font-semibold text-parchment mt-2 font-mono tabular-nums">
                {groups.length}
              </div>
              <div className="text-[11px] text-ink-muted mt-1">tone, twist, background, voice</div>
            </div>
          </div>
        )}
      </section>

      {/* Group cards — always rendered, but empty-state when no data */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(([title, key]) => {
          const rows = s[key];
          return (
            <article
              key={title}
              className={"rcf-card p-5 " + (empty ? "opacity-60" : "")}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="rcf-label">{title}</div>
                {!empty && (
                  <div className="text-[10px] text-ink-muted font-mono">
                    n={rows.reduce((a, r) => a + r.n, 0)}
                  </div>
                )}
              </div>
              {empty ? (
                <div className="py-6 text-center">
                  <div className="text-xs text-parchment-muted">No data yet</div>
                  <div className="text-[10px] text-ink-muted mt-1">
                    Record published video metrics to populate
                  </div>
                </div>
              ) : rows.length === 0 ? (
                <div className="text-xs text-ink-muted py-4 text-center">No data</div>
              ) : (
                <ul className="space-y-1.5">
                  {rows.map((r) => {
                    const pct = Math.round(r.avg_completion * 100);
                    return (
                      <li
                        key={r.key}
                        className="flex items-center justify-between text-sm gap-3"
                      >
                        <span className="text-parchment capitalize truncate">
                          {r.key.replace(/-/g, " ")}
                        </span>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="w-20 h-1.5 bg-panel-soft rounded-full overflow-hidden">
                            <div
                              className="h-full bg-accent"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-parchment font-mono text-xs tabular-nums w-9 text-right">
                            {pct}%
                          </span>
                          <span className="text-ink-muted text-[10px] font-mono w-8 text-right">
                            n={r.n}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
