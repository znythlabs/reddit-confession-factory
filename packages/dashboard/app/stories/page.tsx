import { readAcceptedStories } from "../../lib/readers";

export const dynamic = "force-dynamic";

const truncate = (s: string, n: number) =>
  s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…";

const intensityDot = (level: string) => {
  const n = level === "low" ? 1 : level === "medium" ? 2 : level === "high" ? 3 : 2;
  return "●".repeat(n) + "○".repeat(3 - n);
};

export default async function Page() {
  const items = await readAcceptedStories();
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Accepted stories</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-neutral-300">
            <th className="py-2 pr-4 w-1/3">Hook</th>
            <th className="pr-4">Premise</th>
            <th className="pr-4">Twist</th>
            <th className="pr-4">Tone</th>
            <th className="pr-4">Intensity</th>
            <th className="pr-4">Voice</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ story }) => (
            <tr key={story.story_id} className="border-b border-neutral-200 align-top">
              <td className="py-2 pr-4">{story.hook}</td>
              <td className="pr-4 text-neutral-700">{truncate(story.premise, 90)}</td>
              <td className="pr-4 text-neutral-700">{truncate(story.twist, 90)}</td>
              <td className="pr-4 capitalize">{story.tone}</td>
              <td className="pr-4 text-neutral-600" title={story.intensity}>{intensityDot(story.intensity)}</td>
              <td className="pr-4 font-mono text-xs">{story.tts_voice}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
