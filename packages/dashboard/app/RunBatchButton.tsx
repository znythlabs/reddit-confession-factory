"use client";

import { useState } from "react";

type Status = "idle" | "running" | "ok" | "error";

export function RunBatchButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [output, setOutput] = useState<unknown>(null);

  const run = async () => {
    setStatus("running");
    setOutput(null);
    try {
      const r = await fetch("/api/batch", { method: "POST" });
      const data = await r.json();
      setOutput(data);
      setStatus(r.ok && data.ok ? "ok" : "error");
    } catch (e) {
      setOutput({ error: e instanceof Error ? e.message : String(e) });
      setStatus("error");
    }
  };

  const label =
    status === "idle"
      ? "Run batch now"
      : status === "running"
      ? "Running\u2026"
      : status === "ok"
      ? "Done \u2014 run again"
      : "Failed \u2014 retry";

  const pillClass =
    status === "running"
      ? "rcf-pill-running"
      : status === "ok"
      ? "rcf-pill-ok"
      : status === "error"
      ? "rcf-pill-reject"
      : "rcf-pill-pending";

  return (
    <section className="rcf-card p-5">
      <div className="flex items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-parchment">Operator Control</span>
            <span className={pillClass}>
              <span
                className={
                  "w-1.5 h-1.5 rounded-full " +
                  (status === "running"
                    ? "bg-warning"
                    : status === "ok"
                    ? "bg-success"
                    : status === "error"
                    ? "bg-danger"
                    : "bg-parchment-muted")
                }
              />
              {status}
            </span>
          </div>
          <p className="text-xs text-parchment-muted leading-relaxed">
            Runs the full pipeline once (generator &rarr; heuristic &rarr; judge &rarr; formatter
            &rarr; composer &rarr; exporter &rarr; analytics). Bypasses the 9 AM cron.
          </p>
        </div>
        <button
          onClick={run}
          disabled={status === "running"}
          className="shrink-0 px-5 py-2.5 rounded-md bg-accent hover:bg-accent-soft text-accent-fg text-sm font-medium tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-accent shadow-card"
        >
          {label}
        </button>
      </div>

      {output !== null && (
        <pre className="mt-4 text-[11px] font-mono bg-panel-soft border border-white/5 rounded-md p-3 overflow-x-auto text-parchment-muted leading-relaxed">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </section>
  );
}
