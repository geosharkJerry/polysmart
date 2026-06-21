import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      message: "Legacy captcha is disabled. Polysmart now uses Cloudflare Turnstile before Logto authentication.",
      replacement: "TURNSTILE_LOGTO"
    },
    {
      status: 410,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
