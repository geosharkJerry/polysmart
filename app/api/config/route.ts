import { NextRequest, NextResponse } from "next/server";
import { getSystemConfig, updateScrapeFrequency } from "@/lib/services/system-config";

export async function GET() {
  return NextResponse.json(getSystemConfig());
}

export async function PUT(request: NextRequest) {
  const payload = await request.json();
  const result = updateScrapeFrequency(Number(payload.scrapeFrequencyMinutes));

  if ("error" in result) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }

  return NextResponse.json(result.config);
}
