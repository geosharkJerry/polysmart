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
    redirectUri: new URL(getLogtoCallbackUrl("admin")),
    postRedirectUri: new URL("/admin", request.url),
    loginHint: request.nextUrl.searchParams.get("login_hint") || "infor@polysmart.io",
    interactionMode: "signIn"
  })(request);
}
