import { redirect } from "next/navigation";
import { hasModuleAccess, type AdminModule } from "@/lib/auth";

export async function requireAdminModule(module: AdminModule) {
  if (!(await hasModuleAccess(module))) redirect("/dashboard");
}
