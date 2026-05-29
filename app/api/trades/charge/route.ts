import { NextRequest, NextResponse } from "next/server";
import { processTradeVolumeCharge } from "@/lib/services/billing";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const userId = String(payload.userId || "");
  const executedVolumeUsd = Number(payload.executedVolumeUsd);
  const eventId = String(payload.eventId || "MANUAL");

  if (!userId || !Number.isFinite(executedVolumeUsd) || executedVolumeUsd <= 0) {
    return NextResponse.json(
      { message: "userId and positive executedVolumeUsd are required" },
      { status: 400 }
    );
  }

  const result = processTradeVolumeCharge(userId, executedVolumeUsd, eventId);
  if (result.code === "NOT_FOUND") {
    return NextResponse.json({ message: result.message }, { status: 404 });
  }

  return NextResponse.json(result);
}
