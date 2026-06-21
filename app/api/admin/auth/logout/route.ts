import { NextRequest, NextResponse } from "next/server";
import { getLogtoClient } from "@/lib/services/auth-config";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return getLogtoClient().handleSignOut(new URL("/", request.url).toString())(request);
}
