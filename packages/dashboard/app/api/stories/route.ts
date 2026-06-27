import { NextResponse } from "next/server";
import { readAcceptedStories } from "../../../lib/readers";

export async function GET() {
  const items = await readAcceptedStories();
  return NextResponse.json(items.map(({ story, score }) => ({ story, score })));
}
