import { NextResponse } from "next/server";
import { billingProfiles } from "@/lib/mock-db";

export async function GET() {
  return NextResponse.json({ users: Object.values(billingProfiles) });
}
