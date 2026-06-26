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
  console.error(e);
  process.exit(1);
});
