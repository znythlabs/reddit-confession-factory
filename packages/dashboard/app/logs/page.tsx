import { readFile } from "node:fs/promises";
import path from "node:path";
import { paths } from "@rcf/core";

export const dynamic = "force-dynamic";

export default async function Page() {
  let lines: string[] = [];
  try {
    const raw = await readFile(path.join(paths.logsDir(), "rcf.log"), "utf8");
    lines = raw.split("\n").slice(-200);
  } catch {
    lines = ["(no logs yet)"];
  }
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">Logs (last 200 lines)</h2>
      <pre className="text-xs bg-neutral-100 p-3 overflow-auto">{lines.join("\n")}</pre>
    </section>
  );
}
