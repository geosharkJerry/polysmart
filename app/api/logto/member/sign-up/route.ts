import { NextRequest } from "next/server";
import { assertLogtoConfigured, getLogtoClient, getLogtoCallbackUrl } from "@/lib/services/auth-config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const logtoConfigError = assertLogtoConfigured();
  if (logtoConfigError) {
    return logtoConfigError;
  }

  const client = getLogtoClient();
  return client.handleSignIn({
    redirectUri: new URL(getLogtoCallbackUrl("member")),
    postRedirectUri: new URL("/console", request.url),
    loginHint: request.nextUrl.searchParams.get("login_hint") || undefined,
    interactionMode: "signUp"
  })(request);
}
