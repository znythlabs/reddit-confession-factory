import { generateStoryPackage, persistStory, type GenerateSeed } from "./generate.js";
import { tones, intensities, endings, pickRandom } from "./variants.js";

const count = Number(process.env.RCF_GENERATE_COUNT ?? "1");

const main = async () => {
  for (let i = 0; i < count; i++) {
    const seed: GenerateSeed = {
      tone: pickRandom(tones),
      intensity: pickRandom(intensities),
      endingMode: pickRandom(endings),
      runtimeTarget: 35,
      platforms: ["tiktok_reels", "youtube_shorts"],
    };
    const story = await generateStoryPackage(seed);
    const out = await persistStory(story);
    console.log(`generated ${story.story_id} -> ${out}`);
  }
};

main().catch((e) => {
  // ponytail: console.error(e) trips a Node 24 util.inspect bug when e has a getter
  // that returns undefined. Logging just the message string is safe and still actionable.
  // Use console.error so the orchestrator's stderr-tail capture sees it.
  console.error(`generator: error: ${e?.constructor?.name ?? "Error"}: ${String(e?.message ?? e).slice(0, 200)}`);
  process.exit(1);
});
