import { requireAdminModule } from "@/lib/require-admin-module";

export default async function ModuleLayout({ children }: { children: React.ReactNode }) {
  await requireAdminModule("users");
  return children;
}
