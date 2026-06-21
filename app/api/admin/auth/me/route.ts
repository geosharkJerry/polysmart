import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ensureSingleSuperAdminSeedAsync, getAdminByTokenAsync, resolveAdminToken } from "@/lib/services/admin-auth";
import { LOGTO_ADMIN_SESSION_COOKIE } from "@/lib/services/logto-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensureSingleSuperAdminSeedAsync();
  const token = resolveAdminToken(
    request.headers.get("authorization"),
    request.cookies.get(LOGTO_ADMIN_SESSION_COOKIE)?.value ?? request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? null
  );
  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admin = await getAdminByTokenAsync(token);
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ admin });
}
