import { NextRequest, NextResponse } from "next/server";
import { bindAccount, listAccounts } from "@/lib/services/accounts";
import { AccountPlatform } from "@/lib/types";

const accountPlatforms: AccountPlatform[] = ["polymarket", "kalshi", "predictit"];

export async function GET() {
  return NextResponse.json({ accounts: listAccounts() });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const userId = String(payload.userId || "");
  const platform = payload.platform;
  const label = String(payload.label || "");
  const proxyUrl = String(payload.proxyUrl || "");
  const credentials = payload.credentials;

  if (!userId || !platform || !label || !proxyUrl || !credentials || typeof credentials !== "object") {
    return NextResponse.json({ message: "Invalid account binding payload" }, { status: 400 });
  }

  if (!accountPlatforms.includes(platform)) {
    return NextResponse.json({ message: "Invalid platform enum" }, { status: 400 });
  }

  const result = bindAccount({ userId, platform, label, proxyUrl, credentials });
  return NextResponse.json(result, { status: 201 });
}
