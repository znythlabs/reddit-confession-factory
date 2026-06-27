import path from "node:path";

const ASSETS = path.resolve(process.cwd(), "packages/composer/assets");

const SAFE = /^[a-z0-9-]+$/;

export const backgroundPathFor = (mood: string): string => {
  if (!SAFE.test(mood)) {
    throw new Error(`unsafe mood input: ${mood}`);
  }
  const p = path.join(ASSETS, `${mood}.mp4`);
  if (!p.startsWith(ASSETS + path.sep) && p !== ASSETS) {
    throw new Error(`background path escapes assets dir: ${p}`);
  }
  return p;
};
