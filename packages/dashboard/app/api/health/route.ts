import { NextResponse } from "next/server";
import { readHealth } from "../../../lib/readers";

export async function GET() {
  return NextResponse.json(await readHealth());
}
