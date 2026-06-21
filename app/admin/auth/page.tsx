import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminAuthWorkspace } from "@/components/admin/AdminAuthWorkspace";
import { ADMIN_SESSION_COOKIE, ensureSingleSuperAdminSeedAsync, getAdminByTokenAsync } from "@/lib/services/admin-auth";

export const dynamic = "force-dynamic";

export default async function AdminAuthPage() {
  await ensureSingleSuperAdminSeedAsync();
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value ?? "";
  const admin = token ? await getAdminByTokenAsync(token) : null;

  if (!admin || admin.role !== "super_admin") {
    redirect("/admin/login");
  }

  return <AdminAuthWorkspace admin={{ email: admin.email, role: admin.role }} />;
}
