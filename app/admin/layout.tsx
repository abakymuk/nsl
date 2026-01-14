import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth";
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

  const admin = await isSuperAdmin(user.id);

  if (!admin) {
    redirect("/dashboard");
  }

  // Extract user info for sidebar
  const userData = {
    email: user.email || "",
    name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
  };

  return <SidebarProvider user={userData}>{children}</SidebarProvider>;
}
