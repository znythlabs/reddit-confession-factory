import path from "node:path";

const varDir = process.env.RCF_VAR_DIR ?? path.resolve(process.cwd(), "var");

export const paths = {
  root: varDir,
  storiesDir: () => path.join(varDir, "artifacts", "stories"),
  scoresDir: () => path.join(varDir, "artifacts", "scores"),
  renderDir: () => path.join(varDir, "artifacts", "render"),
  bundlesDir: () => path.join(varDir, "artifacts", "bundles"),
  logsDir: () => path.join(varDir, "logs"),
  storyJson: (id: string) => path.join(varDir, "artifacts", "stories", `${id}.json`),
  scoreJson: (id: string) => path.join(varDir, "artifacts", "scores", `${id}.json`),
  renderJson: (id: string) => path.join(varDir, "artifacts", "render", `${id}.json`),
  bundleDir: (id: string) => path.join(varDir, "artifacts", "bundles", id),
};
