import { NextResponse } from "next/server";
import { getPoolSummary } from "@/lib/services/risk-pool";

export async function GET() {
  return NextResponse.json(getPoolSummary());
}
