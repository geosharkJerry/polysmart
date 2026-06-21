import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ensureSingleSuperAdminSeedAsync, getAdminByTokenAsync, resolveAdminToken } from "@/lib/services/admin-auth";
import { LOGTO_ADMIN_SESSION_COOKIE } from "@/lib/services/logto-session";

export async function requireAdminSession(request: NextRequest) {
  await ensureSingleSuperAdminSeedAsync();
  const token = resolveAdminToken(
    request.headers.get("authorization"),
    request.cookies.get(LOGTO_ADMIN_SESSION_COOKIE)?.value ?? request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? null
  );
  if (!token) {
    return { admin: null, token: null, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) } as const;
  }

  const admin = await getAdminByTokenAsync(token);
  if (!admin || admin.role !== "super_admin") {
    return { admin: null, token: null, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) } as const;
  }

  return { admin, token, response: null } as const;
}
