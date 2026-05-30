import { NextRequest, NextResponse } from "next/server";
import { enqueueBusEvent, getBusSnapshot } from "@/lib/services/priority-bus";

export async function GET() {
  return NextResponse.json(getBusSnapshot());
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const kind = payload.kind;
  const eventId = String(payload.eventId || "");
  const p = payload.payload;

  if (!kind || !eventId || !p || typeof p !== "object") {
    return NextResponse.json({ message: "kind, eventId, payload are required" }, { status: 400 });
  }

  const result = enqueueBusEvent({
    kind,
    eventId,
    payload: p,
    level: payload.level,
    dedupeKey: payload.dedupeKey
  });

  return NextResponse.json(result, { status: result.dropped ? 200 : 201 });
}
