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
