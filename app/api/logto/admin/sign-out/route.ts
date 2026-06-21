import { NextRequest } from "next/server";
import { assertLogtoConfigured, getLogtoClient } from "@/lib/services/auth-config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const logtoConfigError = assertLogtoConfigured();
  if (logtoConfigError) {
    return logtoConfigError;
  }

  const client = getLogtoClient();
  return client.handleSignOut(new URL("/", request.url).toString())(request);
}
