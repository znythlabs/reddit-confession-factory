};

export const readAcceptedStories = async (): Promise<Array<{ story: StoryPackage; score: ScoreReport }>> => {
  const scoreFiles = (await readdir(paths.scoresDir()).catch(() => [])).filter((f) => f.endsWith(".json"));
  const out: Array<{ story: StoryPackage; score: ScoreReport }> = [];
  for (const f of scoreFiles) {
    const score = JSON.parse(await readFile(path.join(paths.scoresDir(), f), "utf8")) as ScoreReport;
    if (score.accept_decision !== "accept") continue;
    const story = JSON.parse(await readFile(paths.storyJson(score.story_id), "utf8")) as StoryPackage;
    out.push({ story, score });
  }
  return out;
};

export const readBundles = async (): Promise<PublishBundle[]> => {
  const root = paths.bundlesDir();
  const storyDirs = (await readdir(root, { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory());
  const out: PublishBundle[] = [];
  for (const sd of storyDirs) {
    const subs = (await readdir(path.join(root, sd.name), { withFileTypes: true }).catch(() => [])).filter((d) => d.isDirectory());
    for (const s of subs) {
      try {
        const raw = await readFile(path.join(root, sd.name, s.name, "bundle.json"), "utf8");
        out.push(JSON.parse(raw) as PublishBundle);
      } catch { /* skip */ }
    }
  }
  return out;
};
```

- [ ] **Step 7: Write `packages/dashboard/lib/format.ts`**

```ts
export const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
```

- [ ] **Step 8: Write `packages/dashboard/app/layout.tsx`**

```tsx
import "./globals.css";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-parchment text-ink min-h-screen">
        <header className="border-b border-neutral-300 px-6 py-4 flex items-center justify-between">
          <h1 className="font-semibold">RCF · Observer Console</h1>
          <nav className="text-sm space-x-4">
            <a href="/">Health</a>
            <a href="/stories">Stories</a>
            <a href="/schedules">Schedules</a>
            <a href="/outcomes">Outcomes</a>
            <a href="/logs">Logs</a>
          </nav>
        </header>
        <main className="p-6">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Write `packages/dashboard/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Write `packages/dashboard/app/page.tsx`**

```tsx
import { readHealth } from "../lib/readers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const h = await readHealth();
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Pipeline health</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["stories", "scores", "render", "bundles", "failed"] as const).map((k) => (
          <div key={k} className="border border-neutral-300 rounded p-3 bg-white">
            <div className="text-xs uppercase text-neutral-500">{k}</div>
            <div className="text-2xl font-semibold">{h[k]}</div>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-neutral-600">Observer only. No approval actions.</p>
    </section>
  );
}
```

- [ ] **Step 11: Write `packages/dashboard/app/stories/page.tsx`**

```tsx
import { readAcceptedStories } from "../../lib/readers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const items = await readAcceptedStories();
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Accepted stories</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-neutral-300">
            <th className="py-2">Hook</th>
            <th>Tone</th>
            <th>Background</th>
            <th>Voice</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ story }) => (
            <tr key={story.story_id} className="border-b border-neutral-200">
              <td className="py-2">{story.hook}</td>
              <td>{story.tone}</td>
              <td>{story.background_mood}</td>
              <td>{story.tts_voice}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
```

- [ ] **Step 12: Write `packages/dashboard/app/schedules/page.tsx`**

```tsx
import { readBundles } from "../../lib/readers";

export const dynamic = "force-dynamic";

export default async function Page() {
  const bundles = await readBundles();
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Schedules</h2>
      <ul className="text-sm space-y-1">
        {bundles.map((b) => (
          <li key={b.video_path} className="border-b border-neutral-200 py-1">
            <span className="font-mono">{b.story_id}</span> · {b.platform} · {b.status}
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 13: Write `packages/dashboard/app/outcomes/page.tsx`**

```tsx
import { summarize } from "@rcf/analytics";

export const dynamic = "force-dynamic";

export default async function Page() {
  const s = summarize();
  const groups = [
    ["By tone", s.byTone],
    ["By twist", s.byTwist],
    ["By background", s.byBackground],
    ["By voice", s.byVoice],
  ] as const;
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Outcomes</h2>
      {groups.map(([title, rows]) => (
        <div key={title} className="mb-6">
          <h3 className="text-sm uppercase text-neutral-500 mb-1">{title}</h3>
          <ul className="text-sm">
            {rows.map((r) => (
              <li key={r.key} className="flex justify-between border-b border-neutral-200 py-1">
                <span>{r.key}</span>
                <span>{Math.round(r.avg_completion * 100)}% · n={r.n}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 14: Write `packages/dashboard/app/logs/page.tsx`**

```tsx
import { readFile } from "node:fs/promises";
import { paths } from "@rcf/core";

export const dynamic = "force-dynamic";

export default async function Page() {
  let lines: string[] = [];
  try {
    const raw = await readFile(path.join(paths.logsDir(), "rcf.log"), "utf8");
    lines = raw.split("\n").slice(-200);
  } catch {
    lines = ["(no logs yet)"];
  }
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Logs (last 200 lines)</h2>
      <pre className="text-xs bg-neutral-100 p-3 overflow-auto">{lines.join("\n")}</pre>
    </section>
  );
}
```

- [ ] **Step 15: Write `packages/dashboard/app/api/stories/route.ts`**

```ts
import { NextResponse } from "next/server";
import { readAcceptedStories } from "../../../lib/readers";

export async function GET() {
  const items = await readAcceptedStories();
  return NextResponse.json(items.map(({ story, score }) => ({ story, score })));
}
```

- [ ] **Step 16: Write `packages/dashboard/app/api/health/route.ts`**

```ts
import { NextResponse } from "next/server";
import { readHealth } from "../../../lib/readers";

export async function GET() {
  return NextResponse.json(await readHealth());
}
```

- [ ] **Step 17: Write `packages/dashboard/app/api/outcomes/route.ts`**

```ts
import { NextResponse } from "next/server";
import { summarize } from "@rcf/analytics";

export async function GET() {
  return NextResponse.json(summarize());
}
```

- [ ] **Step 18: Write `packages/dashboard/tests/api.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { readHealth, readAcceptedStories } from "../lib/readers.js";

describe("dashboard readers", () => {
  it("readHealth returns numeric counts", async () => {
    const h = await readHealth();
    expect(typeof h.stories).toBe("number");
    expect(typeof h.failed).toBe("number");
  });
  it("readAcceptedStories returns an array", async () => {
    const items = await readAcceptedStories();
    expect(Array.isArray(items)).toBe(true);
  });
});
```

- [ ] **Step 19: Install**

Run:
```bash
pnpm --filter @rcf/dashboard install
```

- [ ] **Step 20: Run tests**

Run:
```bash
pnpm --filter @rcf/dashboard test
```
Expected: 2 tests pass.

- [ ] **Step 21: Commit**

```bash
git add packages/dashboard
git commit -m "feat(dashboard): observer-only Next.js console with 5 pages + 3 API routes"
```

---

## Task 12: End-to-end smoke run

**Files:**
- Create: `scripts/smoke.sh`
- Modify: `package.json` (add `smoke` script)

**Interfaces:**
- Runs the full pipeline in stub mode against a single seed story
- Confirms artifacts exist end-to-end
- Exits non-zero on any stage failure

- [ ] **Step 1: Write `scripts/smoke.sh`**

```bash
#!/usr/bin/env bash
