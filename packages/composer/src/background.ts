import { readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(__dirname, "..", "assets", "backgrounds");
const FALLBACK_MOOD = "dark-hallway";
const FALLBACK_FILE = `${FALLBACK_MOOD}-01.png`;

const SAFE = /^[a-z0-9-]+$/;

// ponytail: 32-bit hash of story_id + mood. Same pair always maps to the same
// image, different story_ids distribute across the available files.
const stableIndex = (key: string, n: number): number => {
  const h = createHash("sha256").update(key).digest();
  return h.readUInt32BE(0) % n;
};

const listFiles = (mood: string): string[] => {
  const dir = path.join(ASSETS, mood);
  try {
    return readdirSync(dir)
      .filter((f) => /\.(png|jpg|jpeg)$/i.test(f))
      .sort();
  } catch {
    return [];
  }
};

const validate = (p: string): string => {
  const resolved = path.resolve(p);
  if (!resolved.startsWith(ASSETS + path.sep)) {
    throw new Error(`background path escapes assets dir: ${resolved}`);
  }
  return resolved;
};

export const backgroundPathFor = (mood: string, storyId: string): string => {
  if (!SAFE.test(mood)) {
    throw new Error(`unsafe mood input: ${mood}`);
  }
  if (typeof storyId !== "string" || storyId.length === 0) {
    throw new Error(`storyId is required`);
  }

  // Try the requested mood first, then fall back to dark-hallway.
  let files = listFiles(mood);
  let resolvedMood = mood;
  if (files.length === 0) {
    files = listFiles(FALLBACK_MOOD);
    resolvedMood = FALLBACK_MOOD;
  }
  if (files.length === 0) {
    // Last resort: return the canonical fallback path even if it doesn't exist
    // on disk yet (assets folder empty). The caller should check.
    return validate(path.join(ASSETS, FALLBACK_MOOD, FALLBACK_FILE));
  }

  // Deterministic selection: same (storyId, mood) always returns the same file.
  // Hash input is the original mood so fallback cases still distribute.
  const idx = stableIndex(`${storyId}:${mood}`, files.length);
  const selected = files[idx]!;
  return validate(path.join(ASSETS, resolvedMood, selected));
};

export const __test__ = { ASSETS, FALLBACK_MOOD, FALLBACK_FILE, listFiles, stableIndex };
