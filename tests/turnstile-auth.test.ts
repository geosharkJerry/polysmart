import { afterEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { verifyLoginCaptcha, createLoginCaptcha } from "@/lib/services/login-captcha";
import { POST as memberLoginRoute } from "@/app/api/auth/login/route";
import { POST as adminLoginRoute } from "@/app/api/admin/auth/login/route";

const originalEnv = {
  LOGTO_ENDPOINT: process.env.LOGTO_ENDPOINT,
  LOGTO_APP_ID: process.env.LOGTO_APP_ID,
  LOGTO_APP_SECRET: process.env.LOGTO_APP_SECRET,
  LOGTO_COOKIE_SECRET: process.env.LOGTO_COOKIE_SECRET,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("turnstile compatibility layer", () => {
  it("requires a token", () => {
    const challenge = createLoginCaptcha();
    expect(challenge.code).toBe("TURNSTILE");
    expect(verifyLoginCaptcha("abc")).toBe(true);
    expect(verifyLoginCaptcha("")).toBe(false);
  });
});

function loginRequest(url: string, payload: Record<string, unknown>) {
  return new NextRequest(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}

function configureLogtoOnly() {
  process.env.LOGTO_ENDPOINT = "https://logto.example.com";
  process.env.LOGTO_APP_ID = "app-id";
  process.env.LOGTO_APP_SECRET = "app-secret";
  process.env.LOGTO_COOKIE_SECRET = "cookie-secret-cookie-secret-cookie-secret";
  delete process.env.TURNSTILE_SECRET_KEY;
}

describe("auth routes", () => {
  it("fails closed when Logto is not configured", async () => {
    delete process.env.LOGTO_ENDPOINT;
    delete process.env.LOGTO_APP_ID;
    delete process.env.LOGTO_APP_SECRET;
    delete process.env.LOGTO_COOKIE_SECRET;

    const response = await memberLoginRoute(loginRequest("http://localhost/api/auth/login", { email: "a@b.com" }));
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload.missing).toContain("LOGTO_ENDPOINT");
  });

  it("rejects member login without turnstile after Logto is configured", async () => {
    configureLogtoOnly();
    const response = await memberLoginRoute(loginRequest("http://localhost/api/auth/login", { email: "a@b.com" }));
    expect(response.status).toBe(400);
  });

  it("rejects admin login without turnstile after Logto is configured", async () => {
    configureLogtoOnly();
    const response = await adminLoginRoute(loginRequest("http://localhost/api/admin/auth/login", { email: "infor@polysmart.io" }));
    expect(response.status).toBe(400);
  });
});
