import "../../../lib/env";
import { NextResponse } from "next/server";
import { summarize } from "@rcf/analytics";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(summarize());
}
