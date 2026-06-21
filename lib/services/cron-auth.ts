import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

function configuredCronSecret() {
  const secret = process.env.CRON_SECRET?.trim() || "";
  const lowered = secret.toLowerCase();
  const placeholder =
    !secret ||
    lowered.includes("placeholder") ||
    lowered.includes("example") ||
    lowered.includes("mock") ||
    lowered === "cron11111111111111";

  return placeholder ? null : secret;
}

function timingSafeMatch(left: string, right: string) {
  const leftHash = crypto.createHash("sha256").update(left).digest();
  const rightHash = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

export function requireCronSecret(request: NextRequest) {
  const secret = configuredCronSecret();
  if (!secret) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "CRON_SECRET is missing or still a placeholder; production validation cron is disabled." },
        { status: 503 }
      )
    };
  }

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() || "";
  const headerSecret = request.headers.get("x-cron-secret")?.trim() || "";
  const submitted = bearer || headerSecret;

  if (!submitted || !timingSafeMatch(submitted, secret)) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Invalid cron secret." }, { status: 401 })
    };
  }

  return { ok: true as const, response: null };
}
