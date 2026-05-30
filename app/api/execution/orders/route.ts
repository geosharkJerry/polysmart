import { NextRequest, NextResponse } from "next/server";
import { getExecutionSnapshot } from "@/lib/services/execution";

export async function GET(request: NextRequest) {
  const intentId = request.nextUrl.searchParams.get("intentId") || undefined;
  return NextResponse.json(getExecutionSnapshot(intentId));
}
