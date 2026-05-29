import { NextResponse } from "next/server";
import { listEvents } from "@/lib/services/events";

export async function GET() {
  return NextResponse.json({ events: listEvents() });
}
