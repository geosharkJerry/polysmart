import { NextResponse } from "next/server";
import { getRiskSnapshot } from "@/lib/services/risk-pool";

export async function GET() {
  return NextResponse.json(getRiskSnapshot());
}
