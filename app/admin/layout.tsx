import { redirect } from "next/navigation";
import { getUser, isAdmin } from "@/lib/supabase/server";
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

  const admin = await isAdmin();

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
