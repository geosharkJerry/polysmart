import { NextRequest, NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/lib/services/turnstile";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const token = String(payload.token || payload["turnstileToken"] || "");
  const remoteIp = request.headers.get("cf-connecting-ip");
  const result = await verifyTurnstileToken(token, remoteIp);

  return NextResponse.json(result, {
    status: result.success ? 200 : 400,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

