import { NextResponse } from "next/server";
import { getAuthConfigurationStatus } from "@/lib/services/auth-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAuthConfigurationStatus(), {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
