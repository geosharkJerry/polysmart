import { NextResponse } from "next/server";
import { runtimeState } from "@/lib/store";

export async function GET() {
  return NextResponse.json({ settlements: runtimeState.settlements });
}
