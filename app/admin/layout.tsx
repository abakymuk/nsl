import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AdminSidebar, MobileAdminNav } from "@/components/admin/sidebar";

// List of admin email addresses
const ADMIN_EMAILS = [
  "vladimirovelyan@gmail.com",
  "admin@newstream-logistics.com",
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;

  // Check if user is an admin
  if (!userEmail || !ADMIN_EMAILS.includes(userEmail)) {
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
