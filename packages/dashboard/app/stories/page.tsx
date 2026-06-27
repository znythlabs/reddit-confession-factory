import { readAcceptedStories, readExportStatuses } from "../../lib/readers";
import { StoryCard, type ExportStatus } from "./StoryCard";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [items, exportStatuses] = await Promise.all([
    readAcceptedStories(),
    readExportStatuses(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-parchment tracking-tight">Accepted Stories</h1>
          <p className="text-sm text-parchment-muted mt-1">
            Stories accepted after scoring and ready for render/export.
          </p>
        </div>
        <div className="text-right">
          <div className="rcf-label">Total</div>
          <div className="text-2xl font-semibold text-parchment font-mono tabular-nums">
            {items.length}
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="rcf-card p-8 text-center">
          <div className="text-parchment-muted text-sm">No accepted stories yet</div>
          <div className="text-ink-muted text-xs mt-1">
            Run a batch to generate and score stories.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map(({ story, score }) => {
            const status: ExportStatus = exportStatuses.get(story.story_id) ?? {
              renderPackage: false,
              mp4: false,
              bundle: false,
            };
            return <StoryCard key={story.story_id} story={story} score={score} status={status} />;
          })}
        </div>
      )}
    </div>
  );
}
