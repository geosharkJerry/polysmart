import { NextResponse } from "next/server";
import { settlementLedgers } from "@/lib/mock-db";

export async function GET() {
  return NextResponse.json({ settlements: settlementLedgers });
}
