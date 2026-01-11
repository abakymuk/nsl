import { redirect } from "next/navigation";
import { getUser, isAdmin } from "@/lib/supabase/server";
import { AdminSidebar, MobileAdminNav } from "@/components/admin/sidebar";

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

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminSidebar />
      <div className="lg:pl-64">
        <main className="py-6 px-4 sm:px-6 lg:px-8 pb-24 lg:pb-6">
          {children}
        </main>
      </div>
      <MobileAdminNav />
    </div>
  );
}
