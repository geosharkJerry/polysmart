import { NextResponse } from "next/server";
import { t0Events } from "@/lib/mock-db";

export async function GET() {
  return NextResponse.json({ events: t0Events });
}
