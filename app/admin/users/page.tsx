"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  Loader2,
  Search,
  Crown,
  User,
  CheckCircle,
  XCircle,
  Shield,
  ShieldOff,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "super_admin" | "user";
  created_at: string;
  organization?: {
    id: string;
    name: string;
  } | null;
  org_role?: "admin" | "member" | null;
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        setError("Failed to load users");
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const toggleSuperAdmin = async (userId: string, currentRole: string) => {
    setProcessingId(userId);
    setError(null);
    setSuccess(null);

    try {
      const action = currentRole === "super_admin" ? "revoke" : "grant";
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update user");
        return;
      }

      setSuccess(
        action === "grant"
          ? "Super admin access granted"
          : "Super admin access revoked"
      );
      await loadUsers();
    } catch {
      setError("Failed to update user");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          Manage platform users and super admin access
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-lg">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {success}
          <button
            onClick={() => setSuccess(null)}
            className="ml-auto text-green-600 hover:text-green-700"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Users ({users.length})</CardTitle>
          <CardDescription>
            View and manage all registered users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No users found
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        user.role === "super_admin"
                          ? "bg-amber-100"
                          : "bg-primary/10"
                      }`}
                    >
                      {user.role === "super_admin" ? (
                        <Crown className="h-5 w-5 text-amber-600" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {user.full_name || user.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                      {user.organization && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {user.organization.name} ({user.org_role})
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {user.role === "super_admin" && (
                      <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        Super Admin
                      </span>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleSuperAdmin(user.id, user.role)}
                      disabled={processingId === user.id}
                      className={
                        user.role === "super_admin"
                          ? "text-red-600 hover:text-red-700 hover:bg-red-50"
                          : ""
                      }
                    >
                      {processingId === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : user.role === "super_admin" ? (
                        <>
                          <ShieldOff className="h-4 w-4 mr-1" />
                          Revoke
                        </>
                      ) : (
                        <>
                          <Shield className="h-4 w-4 mr-1" />
                          Grant Admin
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
