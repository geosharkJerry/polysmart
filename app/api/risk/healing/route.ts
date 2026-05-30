import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs, getRiskBundle } from "@/lib/services/risk-pool";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") || 100);
  const snapshot = getRiskBundle();
  return NextResponse.json({
    ...snapshot,
    logs: getAuditLogs(limit)
  });
}
