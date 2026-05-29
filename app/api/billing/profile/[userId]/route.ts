import { NextRequest, NextResponse } from "next/server";
import { billingProfiles } from "@/lib/mock-db";
import { BillingMode, SettlementFrequency } from "@/lib/types";

const billingModes: BillingMode[] = ["PERFORMANCE", "SUBSCRIPTION"];
const settlementFrequencies: SettlementFrequency[] = ["EVENT_END", "DAILY", "WEEKLY"];

export async function GET(_: NextRequest, { params }: { params: { userId: string } }) {
  const profile = billingProfiles[params.userId];
  if (!profile) {
    return NextResponse.json({ message: "Profile not found" }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  const profile = billingProfiles[params.userId];
  if (!profile) {
    return NextResponse.json({ message: "Profile not found" }, { status: 404 });
  }

  const payload = await request.json();

  if (payload.billingMode && !billingModes.includes(payload.billingMode)) {
    return NextResponse.json({ message: "Invalid billingMode" }, { status: 400 });
  }

  if (payload.settlementFrequency && !settlementFrequencies.includes(payload.settlementFrequency)) {
    return NextResponse.json({ message: "Invalid settlementFrequency" }, { status: 400 });
  }

  if (
    payload.volumeFeeRate !== undefined &&
    (!Number.isFinite(payload.volumeFeeRate) || payload.volumeFeeRate < 0.001 || payload.volumeFeeRate > 0.03)
  ) {
    return NextResponse.json({ message: "volumeFeeRate must be in [0.001, 0.03]" }, { status: 400 });
  }

  billingProfiles[params.userId] = {
    ...profile,
    ...payload,
    volumeFeeRate: payload.volumeFeeRate ?? profile.volumeFeeRate
  };

  return NextResponse.json(billingProfiles[params.userId]);
}
