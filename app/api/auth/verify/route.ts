import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      message: "Legacy email verification is disabled. Email identity verification is handled by Logto before the member console session is issued.",
      replacement: "LOGTO_EMAIL_VERIFICATION"
    },
    { status: 410 }
  );
}
