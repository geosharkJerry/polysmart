import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, ensureSingleSuperAdminSeedAsync, getAdminByTokenAsync, listAdminsAsync, resolveAdminToken } from "@/lib/services/admin-auth";

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

  return NextResponse.json({ admins: await listAdminsAsync() });
}
