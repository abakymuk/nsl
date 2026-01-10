import { currentUser } from "@clerk/nextjs/server";
import { UserProfile } from "@clerk/nextjs";
import { Building2, Mail, Phone, MapPin } from "lucide-react";

export default async function ProfilePage() {
  const user = await currentUser();

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
              {user?.firstName?.[0] || user?.emailAddresses[0]?.emailAddress[0]?.toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">
              {user?.firstName} {user?.lastName}
            </h2>
            <p className="text-muted-foreground">
              {user?.emailAddresses[0]?.emailAddress}
            </p>
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

      {/* Clerk UserProfile for account management */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg">Account Settings</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your email, password, and security settings
          </p>
        </div>
        <div className="p-6">
          <UserProfile
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 w-full",
                navbar: "hidden",
                pageScrollBox: "p-0",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
