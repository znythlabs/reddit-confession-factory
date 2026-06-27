import path from "node:path";

const getVarDir = () => process.env.RCF_VAR_DIR ?? path.resolve(process.cwd(), "var");

export const paths = {
  get root() {
    return getVarDir();
  },
  storiesDir: () => path.join(getVarDir(), "artifacts", "stories"),
  scoresDir: () => path.join(getVarDir(), "artifacts", "scores"),
  renderDir: () => path.join(getVarDir(), "artifacts", "render"),
  bundlesDir: () => path.join(getVarDir(), "artifacts", "bundles"),
  logsDir: () => path.join(getVarDir(), "logs"),
  storyJson: (id: string) => path.join(getVarDir(), "artifacts", "stories", `${id}.json`),
  scoreJson: (id: string) => path.join(getVarDir(), "artifacts", "scores", `${id}.json`),
  renderJson: (id: string) => path.join(getVarDir(), "artifacts", "render", `${id}.json`),
  bundleDir: (id: string) => path.join(getVarDir(), "artifacts", "bundles", id),
};
