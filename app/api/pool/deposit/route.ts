import { NextRequest, NextResponse } from "next/server";
import { depositPool, emergencyWithdraw } from "@/lib/services/risk-pool";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const userId = String(payload.userId || "");
  const amountUsd = Number(payload.amountUsd);

  if (!userId) {
    return NextResponse.json({ message: "userId is required" }, { status: 400 });
  }

  if (payload.action === "withdraw") {
    return NextResponse.json(emergencyWithdraw(userId));
  }

  if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
    return NextResponse.json({ message: "amountUsd must be positive" }, { status: 400 });
  }

  return NextResponse.json(depositPool(userId, amountUsd));
}
