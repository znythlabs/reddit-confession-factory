import { readFile } from "node:fs/promises";
import path from "node:path";
import { paths } from "@rcf/core";

export const dynamic = "force-dynamic";

export default async function Page() {
  let lines: string[] = [];
  let loaded = false;
  try {
    const raw = await readFile(path.join(paths.logsDir(), "rcf.log"), "utf8");
    lines = raw.split("\n").slice(-200);
    loaded = true;
  } catch {
    // no logs yet
  }

  const isEmpty = !loaded || (lines.length === 1 && lines[0] === "");

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-parchment tracking-tight">Logs</h1>
          <p className="text-sm text-parchment-muted mt-1">
            Tail of <span className="font-mono text-parchment">rcf.log</span> (last 200 lines).
          </p>
        </div>
        <div className="text-right">
          <div className="rcf-label">Lines</div>
          <div className="text-2xl font-semibold text-parchment font-mono tabular-nums">
            {isEmpty ? 0 : lines.length}
          </div>
        </div>
      </header>

      <div className="rcf-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-panel-soft">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-danger/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-warning/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-success/70" />
            <span className="ml-2 text-[11px] text-parchment-muted font-mono">rcf.log</span>
          </div>
          <div className="text-[10px] text-ink-muted font-mono uppercase tracking-wider">
            tail -200
          </div>
        </div>

        {isEmpty ? (
          <div className="h-[500px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-parchment-muted text-sm">No logs yet</div>
              <div className="text-ink-muted text-xs mt-1">
                Run a batch to generate log output.
              </div>
            </div>
          </div>
        ) : (
          <pre className="h-[500px] overflow-y-auto p-4 font-mono text-xs text-parchment-muted whitespace-pre-wrap leading-relaxed">
            {lines.join("\n")}
          </pre>
        )}
      </div>
    </div>
  );
}
