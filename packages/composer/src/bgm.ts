import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const pexec = promisify(execFile);

export const bgmToFile = async (mood: string, outFile: string): Promise<string> => {
  // ponytail: shells out to npx hyperframes bgm --mood <m> --out <f> until CLI is wired.
  await pexec("npx", ["hyperframes", "bgm", "--mood", mood, "--out", outFile], { cwd: path.resolve(process.cwd()) });
  return outFile;
};
