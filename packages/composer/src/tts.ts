import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const pexec = promisify(execFile);

export const ttsToFile = async (text: string, voice: string, outFile: string): Promise<string> => {
  // ponytail: shells out to npx hyperframes tts --voice <v> --text <t> --out <f> until the CLI is wired.
  // Add when the pipeline first reaches audio generation.
  await pexec("npx", ["hyperframes", "tts", "--voice", voice, "--text", text, "--out", outFile], { cwd: path.resolve(process.cwd()) });
  return outFile;
};
