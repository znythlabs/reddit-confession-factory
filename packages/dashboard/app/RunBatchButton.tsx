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

  const label = status === "idle" ? "Run batch now"
    : status === "running" ? "Running…"
    : status === "ok" ? "Done — run again"
    : "Failed — retry";

  return (
    <div className="mt-6 border border-neutral-300 rounded p-4 bg-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold">Manual batch</div>
          <div className="text-xs text-neutral-500">
            Runs the full pipeline once (generator → heuristic → judge → formatter → composer → exporter → analytics).
            Bypasses the 9 AM cron.
          </div>
        </div>
        <button
          onClick={run}
          disabled={status === "running"}
          className="px-4 py-2 rounded bg-ink text-parchment text-sm font-medium disabled:opacity-50"
        >
          {label}
        </button>
      </div>
      {output !== null && (
        <pre className="mt-3 text-xs bg-neutral-50 border border-neutral-200 rounded p-2 overflow-x-auto">
          {JSON.stringify(output, null, 2)}
        </pre>
      )}
    </div>
  );
}
