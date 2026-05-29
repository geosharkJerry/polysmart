import { NextResponse } from "next/server";
import { listProfiles } from "@/lib/services/billing";

export async function GET() {
  return NextResponse.json({ users: listProfiles() });
}
