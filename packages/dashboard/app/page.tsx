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
