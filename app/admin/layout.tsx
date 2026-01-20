import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import {
  isSuperAdmin,
  getEmployeePermissions,
  type AdminModule,
} from "@/lib/auth";
import { SidebarProvider } from "@/components/admin/sidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const isAdmin = await isSuperAdmin(user.id);
  const permissions = await getEmployeePermissions(user.id);

  // Must be super admin OR have at least one permission (employee)
  if (!isAdmin && permissions.length === 0) {
    redirect("/dashboard");
  }

  // Extract user info for sidebar
  const userData = {
    email: user.email || "",
    name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
  };

  return (
    <SidebarProvider
      user={userData}
      permissions={permissions}
      isSuperAdmin={isAdmin}
    >
      {children}
    </SidebarProvider>
  );
}
