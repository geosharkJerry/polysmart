import { NextRequest, NextResponse } from "next/server";
import { billingProfiles, settlementLedgers } from "@/lib/mock-db";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const userId: string = payload.userId;
  const executedVolumeUsd = Number(payload.executedVolumeUsd);
  const eventId = String(payload.eventId || "MANUAL");

  if (!userId || !Number.isFinite(executedVolumeUsd) || executedVolumeUsd <= 0) {
    return NextResponse.json(
      { message: "userId and positive executedVolumeUsd are required" },
      { status: 400 }
    );
  }

  const profile = billingProfiles[userId];
  if (!profile) {
    return NextResponse.json({ message: "Profile not found" }, { status: 404 });
  }

  if (profile.billingMode !== "SUBSCRIPTION") {
    return NextResponse.json({ code: "BYPASS_VOLUME_CHARGE", profile });
  }

  const serviceFee = executedVolumeUsd * profile.volumeFeeRate;
  if (profile.pscBalance < serviceFee) {
    profile.accountStatus = "quota_exhausted";
    return NextResponse.json({
      code: "INSUFFICIENT_TOKEN_HALT",
      requiredFee: serviceFee,
      currentBalance: profile.pscBalance,
      profile
    });
  }

  profile.pscBalance = Number((profile.pscBalance - serviceFee).toFixed(4));
  profile.totalTradedVolumeUsd = Number((profile.totalTradedVolumeUsd + executedVolumeUsd).toFixed(2));

  settlementLedgers.unshift({
    id: `SET-${Math.floor(Math.random() * 900000 + 100000)}`,
    userId,
    mode: profile.billingMode,
    eventId,
    tradedVolumeUsd: executedVolumeUsd,
    platformRevenueUsd: Number(serviceFee.toFixed(2)),
    timestamp: new Date().toISOString()
  });

  return NextResponse.json({ code: "VOLUME_FEE_SUCCESS", serviceFee, profile });
}
