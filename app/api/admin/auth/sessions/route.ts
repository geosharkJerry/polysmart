import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ensureSingleSuperAdminSeedAsync, getAdminByTokenAsync, resolveAdminToken } from "@/lib/services/admin-auth";
import { runtimeState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  await ensureSingleSuperAdminSeedAsync();
  const token = resolveAdminToken(
    request.headers.get("authorization"),
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value ?? null
  );
  const admin = token ? await getAdminByTokenAsync(token) : null;
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const admins = Object.values(runtimeState.admins).map((row) => ({
    adminId: row.adminId,
    email: row.email,
    role: row.role,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt
  }));
  const sessions = Object.values(runtimeState.adminSessions)
    .map((session) => ({
      tokenPreview: `${session.token.slice(0, 8)}…${session.token.slice(-6)}`,
      adminId: session.adminId,
      issuedAt: session.issuedAt,
      expiresAt: session.expiresAt,
      active: Date.parse(session.expiresAt) > Date.now()
    }))
    .sort((a, b) => Date.parse(b.issuedAt) - Date.parse(a.issuedAt));

  return NextResponse.json({ admins, sessions });
}
