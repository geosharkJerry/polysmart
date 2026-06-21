import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/services/admin-guard";
import { requireMemberSession } from "@/lib/services/member-guard";

export async function requireMemberOrAdmin(
  request: NextRequest,
  options?: { userId?: string; requireVerified?: boolean }
) {
  const admin = await requireAdminSession(request);
  if (!admin.response) {
    return { admin: admin.admin, user: null, response: null } as const;
  }

  const member = await requireMemberSession(request, options);
  if (member.response) {
    return { admin: null, user: null, response: member.response } as const;
  }

  return { admin: null, user: member.user, response: null } as const;
}
