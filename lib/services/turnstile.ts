import crypto from "node:crypto";
import { getTurnstileSecretKey } from "@/lib/services/auth-config";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export async function verifyTurnstileToken(token: string, remoteIp?: string | null) {
  const secret = getTurnstileSecretKey();
  if (!secret) {
    return { success: false, reason: "TURNSTILE_SECRET_NOT_CONFIGURED" as const };
  }

  if (!token.trim()) {
    return { success: false, reason: "TURNSTILE_TOKEN_MISSING" as const };
  }

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp) {
    form.set("remoteip", remoteIp);
  }

  const response = await fetch(VERIFY_URL, {
    method: "POST",
    body: form
  });

  if (!response.ok) {
    return { success: false, reason: "TURNSTILE_VERIFY_HTTP_ERROR" as const };
  }

  const payload = (await response.json()) as { success?: boolean; ["error-codes"]?: string[] };
  return {
    success: Boolean(payload.success),
    reason: payload.success ? "OK" as const : "TURNSTILE_VERIFY_FAILED" as const,
    errorCodes: payload["error-codes"] ?? []
  };
}

