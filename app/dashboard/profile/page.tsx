import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { Building2, Phone, MapPin } from "lucide-react";

export default async function ProfilePage() {
  const user = await getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const email = user.email || "";
  const firstName = user.user_metadata?.full_name?.split(" ")[0] || email.split("@")[0];
  const lastName = user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Profile Card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-primary">
              {firstName[0]?.toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {firstName} {lastName}
            </h2>
            <p className="text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>

      {/* Company Information */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold text-lg mb-4">Company Information</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Add your company details to auto-fill quote forms
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              Company Name
            </label>
            <input
              type="text"
              placeholder="Enter company name"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              disabled
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="Enter phone number"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              disabled
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Default Delivery Address
            </label>
            <input
              type="text"
              placeholder="Enter default delivery address"
              className="w-full px-3 py-2 rounded-lg border bg-background text-sm"
              disabled
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Company profile editing coming soon
        </p>
      </div>

      {/* Account Settings */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="font-semibold text-lg mb-4">Account Settings</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Manage your email and security settings
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
            <div>
              <p className="font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-background">
            <div>
              <p className="font-medium">Password</p>
              <p className="text-sm text-muted-foreground">••••••••</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Password change coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
