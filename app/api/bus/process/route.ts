import { NextRequest, NextResponse } from "next/server";
import { processBusBatch, processNextBusEvent } from "@/lib/services/priority-bus";

export async function POST(request: NextRequest) {
  const payload = await request.json().catch(() => ({}));
  const batchSize = Number(payload.batchSize ?? 1);

  if (Number.isFinite(batchSize) && batchSize > 1) {
    return NextResponse.json(processBusBatch(batchSize));
  }

  return NextResponse.json(processNextBusEvent());
}
