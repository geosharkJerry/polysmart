import { NextRequest, NextResponse } from "next/server";
import { platformConfig } from "@/lib/mock-db";

export async function GET() {
  return NextResponse.json(platformConfig);
}

export async function PUT(request: NextRequest) {
  const payload = await request.json();
  const value = Number(payload.scrapeFrequencyMinutes);

  if (!Number.isFinite(value) || value < 1 || value > 60) {
    return NextResponse.json(
      { message: "scrapeFrequencyMinutes must be between 1 and 60" },
      { status: 400 }
    );
  }

  platformConfig.scrapeFrequencyMinutes = Math.round(value);
  return NextResponse.json(platformConfig);
}
