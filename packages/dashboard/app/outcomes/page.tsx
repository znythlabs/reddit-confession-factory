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
