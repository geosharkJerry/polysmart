import LogtoClient from "@logto/next/edge";
import { NextResponse } from "next/server";

export type AuthSurface = "member" | "admin";

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getAppBaseUrl() {
  return trimTrailingSlash(process.env.APP_BASE_URL || "https://www.polysmart.io");
}

export function getLogtoConfig() {
  const endpoint = process.env.LOGTO_ENDPOINT || "";
  const appId = process.env.LOGTO_APP_ID || "";
  const appSecret = process.env.LOGTO_APP_SECRET || "";
  return {
    endpoint,
    appId,
    appSecret,
    scopes: ["profile", "email"],
    baseUrl: getAppBaseUrl(),
    cookieSecret: process.env.LOGTO_COOKIE_SECRET || process.env.LOGTO_APP_SECRET || "",
    cookieSecure: process.env.NODE_ENV === "production"
  };
}

export function getAuthConfigurationStatus() {
  const logto = getLogtoConfig();
  // 直接访问 env 变量以确保它们不会被 tree-shake
  const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || "";
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY || "";
  return {
    logto: {
      configured: Boolean(logto.endpoint && logto.appId && logto.appSecret && logto.cookieSecret),
      missing: [
        !logto.endpoint ? "LOGTO_ENDPOINT" : null,
        !logto.appId ? "LOGTO_APP_ID" : null,
        !logto.appSecret ? "LOGTO_APP_SECRET" : null,
        !logto.cookieSecret ? "LOGTO_COOKIE_SECRET" : null
      ].filter(Boolean) as string[]
    },
    turnstile: {
      configured: Boolean(turnstileSiteKey && turnstileSecretKey),
      missing: [
        !turnstileSiteKey ? "TURNSTILE_SITE_KEY" : null,
        !turnstileSecretKey ? "TURNSTILE_SECRET_KEY" : null
      ].filter(Boolean) as string[]
    }
  };
}

export function assertLogtoConfigured() {
  const status = getAuthConfigurationStatus().logto;
  if (!status.configured) {
    return NextResponse.json(
      {
        message: "Logto authentication is not configured for production.",
        missing: status.missing
      },
      { status: 503 }
    );
  }
  return null;
}

export function getLogtoClient() {
  const config = getLogtoConfig();
  return new LogtoClient({
    endpoint: config.endpoint,
    appId: config.appId,
    appSecret: config.appSecret,
    scopes: config.scopes,
    baseUrl: config.baseUrl,
    cookieSecret: config.cookieSecret,
    cookieSecure: config.cookieSecure
  });
}

export function getLogtoCallbackUrl(surface: AuthSurface) {
  return `${getAppBaseUrl()}/api/logto/${surface}/callback`;
}

export function getLogtoSignInUrl(surface: AuthSurface) {
  return `${getAppBaseUrl()}/api/logto/${surface}/sign-in`;
}

export function getLogtoSignUpUrl(surface: AuthSurface) {
  return `${getAppBaseUrl()}/api/logto/${surface}/sign-up`;
}

export function getLogtoSignOutUrl(surface: AuthSurface) {
  return `${getAppBaseUrl()}/api/logto/${surface}/sign-out`;
}

export function getTurnstileSiteKey() {
  return process.env.TURNSTILE_SITE_KEY || "";
}

export function getTurnstileSecretKey() {
  return process.env.TURNSTILE_SECRET_KEY || "";
}

export function hasTurnstileConfigured() {
  return Boolean(getTurnstileSiteKey() && getTurnstileSecretKey());
}
