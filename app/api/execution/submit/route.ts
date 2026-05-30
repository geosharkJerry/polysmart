import { NextRequest, NextResponse } from "next/server";
import { cancelIntentOrders, submitIntent } from "@/lib/services/execution";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const intentId = String(payload.intentId || "");
  if (!intentId) {
    return NextResponse.json({ message: "intentId is required" }, { status: 400 });
  }

  if (payload.action === "cancel") {
    const rows = await cancelIntentOrders(intentId);
    return NextResponse.json({ canceled: rows.length, orders: rows });
  }

  const leaseMs = payload.leaseMs === undefined ? undefined : Number(payload.leaseMs);
  const result = await submitIntent(intentId, {
    leaseMs: Number.isFinite(leaseMs) ? leaseMs : undefined
  });

  if ("error" in result) {
    const status = result.code === "LOCK_HELD" ? 409 : 500;
    if (result.error === "Intent not found") {
      return NextResponse.json({ message: result.error }, { status: 404 });
    }
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}
