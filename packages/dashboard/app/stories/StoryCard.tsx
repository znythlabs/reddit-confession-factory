"use client";

import { useState } from "react";
import type { StoryPackage, ScoreReport } from "@rcf/core";

export type ExportStatus = { renderPackage: boolean; mp4: boolean; bundle: boolean };

const intensityMark = (level: string) => {
  const n = level === "soft" ? 1 : level === "medium" ? 2 : level === "high" ? 3 : 2;
  return "\u25CF".repeat(n) + "\u25CB".repeat(3 - n);
};

const statusPill = (ready: boolean) => (ready ? "rcf-pill-ok" : "rcf-pill-pending");

const truncate = (s: string, n: number) =>
  s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "\u2026";

export function StoryCard({
  story,
  score,
  status,
}: {
  story: StoryPackage;
  score: ScoreReport;
  status: ExportStatus;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalDuration = story.story_blocks.reduce((a, b) => a + b.suggested_duration_s, 0);
  const fullText = [story.hook, ...story.story_blocks.map((b) => b.text), story.twist].join(" ");
  const wordCount = fullText.trim().split(/\s+/).filter(Boolean).length;

  return (
    <article className="rcf-card p-5 space-y-3">
      {/* Header: hook + status */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-parchment leading-snug">
          {story.hook}
        </p>
        <span
          className={
            score.accept_decision === "accept"
              ? "rcf-pill-ok shrink-0"
              : "rcf-pill-reject shrink-0"
          }
        >
          {score.accept_decision}
        </span>
      </div>

      {/* Premise + twist */}
      <div className="space-y-2.5 text-xs">
        <div>
          <div className="rcf-label">Premise</div>
          <p className="mt-1 text-parchment-muted leading-relaxed">
            {expanded ? story.premise : truncate(story.premise, 160)}
          </p>
        </div>
        <div>
          <div className="rcf-label">Twist</div>
          <p className="mt-1 text-parchment-muted italic leading-relaxed">
            {expanded ? story.twist : truncate(story.twist, 160)}
          </p>
        </div>
      </div>

      {/* Expanded: full story blocks */}
      {expanded && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="rcf-label">Story blocks &middot; {story.story_blocks.length}</div>
            <div className="text-[10px] text-ink-muted font-mono">
              {totalDuration}s &middot; {wordCount} words
            </div>
          </div>
          <ol className="space-y-1.5">
            {story.story_blocks.map((b) => (
              <li key={b.index} className="flex gap-2 text-xs text-parchment-muted">
                <span className="font-mono text-ink-muted shrink-0 w-5 text-right">
                  {String(b.index + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-warning/70 shrink-0 w-7 text-right">
                  {b.suggested_duration_s}s
                </span>
                <span className="leading-relaxed">{b.text}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Expand/collapse */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-[11px] text-parchment-muted hover:text-parchment transition-colors flex items-center gap-1"
      >
        <span className="text-[10px]">{expanded ? "\u25B2" : "\u25BC"}</span>
        <span>{expanded ? "Collapse" : "Read full story"}</span>
        {expanded && (
          <span className="text-ink-muted font-mono ml-1">
            {story.story_blocks.length} blocks &middot; {totalDuration}s &middot; {wordCount} words
          </span>
        )}
      </button>

      {/* Export status */}
      <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-white/5">
        <span className="rcf-label mr-1">Export</span>
        <span className={statusPill(status.renderPackage)}>
          <span className="text-[10px]">Render pkg</span>
          <span className="text-[10px]">{status.renderPackage ? "ready" : "missing"}</span>
        </span>
        <span className={statusPill(status.mp4)}>
          <span className="text-[10px]">MP4</span>
          <span className="text-[10px]">{status.mp4 ? "ready" : "missing"}</span>
        </span>
        <span className={statusPill(status.bundle)}>
          <span className="text-[10px]">Bundle</span>
          <span className="text-[10px]">{status.bundle ? "ready" : "missing"}</span>
        </span>
      </div>

      {/* Footer badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="rcf-pill-pending capitalize">{story.tone}</span>
        <span className="rcf-pill-pending" title={`intensity: ${story.intensity}`}>
          <span className="font-mono tracking-wider text-[10px]">
            {intensityMark(story.intensity)}
          </span>
          <span className="text-[10px]">{story.intensity}</span>
        </span>
        <span className="rcf-pill-pending font-mono text-[10px]">
          {story.tts_voice}
        </span>
        <span className="rcf-pill-pending text-[10px]">
          {story.background_mood}
        </span>
        <span className="text-[10px] text-ink-muted ml-auto font-mono">
          {story.story_id}
        </span>
      </div>
    </article>
  );
}
