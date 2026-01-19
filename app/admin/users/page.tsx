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
  Mail,
  UserPlus,
  Clock,
  Trash2,
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

interface Invitation {
  id: string;
  email: string;
  platform_role: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  created_at: string;
  expires_at: string;
  inviter_name: string | null;
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadUsers(), loadInvitations()]);
    setLoading(false);
  };

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
    }
  };

  const loadInvitations = async () => {
    try {
      const res = await fetch("/api/admin/invitations");
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch {
      // Silently fail - invitations are optional feature
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

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send invitation");
        return;
      }

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      await loadInvitations();
    } catch {
      setError("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    setProcessingId(invitationId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/invitations?id=${invitationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to revoke invitation");
        return;
      }

      setSuccess("Invitation revoked");
      await loadInvitations();
    } catch {
      setError("Failed to revoke invitation");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingInvitations = invitations.filter((inv) => inv.status === "pending");

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

      {/* Invite New Admin */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Platform Admin
          </CardTitle>
          <CardDescription>
            Send an invitation to grant someone super admin access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={sendInvite} className="flex gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Enter email address..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-10"
                disabled={inviting}
              />
            </div>
            <Button type="submit" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Invitations ({pendingInvitations.length})
            </CardTitle>
            <CardDescription>
              Invitations awaiting acceptance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-dashed border-amber-300 bg-amber-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-amber-100">
                      <Mail className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Invited{" "}
                        {new Date(invitation.created_at).toLocaleDateString()}
                        {invitation.inviter_name && ` by ${invitation.inviter_name}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                      Pending
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeInvitation(invitation.id)}
                      disabled={processingId === invitation.id}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Users */}
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
