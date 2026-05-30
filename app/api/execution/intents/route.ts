import { NextRequest, NextResponse } from "next/server";
import { createIntent, getExecutionSnapshot } from "@/lib/services/execution";
import { AccountPlatform, OrderIntentLeg } from "@/lib/types";

const platforms: AccountPlatform[] = ["polymarket", "kalshi", "predictit"];

export async function GET() {
  return NextResponse.json(getExecutionSnapshot());
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const userId = String(payload.userId || "");
  const eventId = String(payload.eventId || "");
  const legs = Array.isArray(payload.legs) ? payload.legs : [];

  if (!userId || !eventId || legs.length === 0) {
    return NextResponse.json({ message: "userId, eventId and legs are required" }, { status: 400 });
  }

  const normalized: OrderIntentLeg[] = [];
  for (const leg of legs) {
    if (!platforms.includes(leg.platform)) {
      return NextResponse.json({ message: `invalid platform ${leg.platform}` }, { status: 400 });
    }
    const notionalUsd = Number(leg.notionalUsd);
    const limitPrice = Number(leg.limitPrice);
    if (!Number.isFinite(notionalUsd) || notionalUsd <= 0 || !Number.isFinite(limitPrice) || limitPrice <= 0 || limitPrice >= 1) {
      return NextResponse.json({ message: "invalid leg notionalUsd/limitPrice" }, { status: 400 });
    }

    normalized.push({
      platform: leg.platform,
      marketId: String(leg.marketId || eventId),
      side: leg.side === "NO" ? "NO" : "YES",
      notionalUsd,
      limitPrice,
      orderType: leg.orderType === "TAKER" ? "TAKER" : "MAKER"
    });
  }

  const intent = createIntent(userId, eventId, normalized);
  return NextResponse.json(intent, { status: 201 });
}
