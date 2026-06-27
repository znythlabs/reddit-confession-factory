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
