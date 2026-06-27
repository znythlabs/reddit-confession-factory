import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const pexec = promisify(execFile);

export const ttsToFile = async (text: string, voice: string, outFile: string): Promise<string> => {
  // ponytail: hyperframes tts takes the text as a positional arg and -o/--output for the file.
  await pexec("npx", ["hyperframes", "tts", text, "-v", voice, "-o", outFile], { cwd: path.resolve(process.cwd()) });
  return outFile;
};
