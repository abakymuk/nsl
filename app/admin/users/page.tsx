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
  Users,
  Activity,
  CalendarDays,
  Building2,
  UserCog,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: "super_admin" | "user";
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  is_platform_employee: boolean;
  employee_permissions: string[] | null;
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

interface Stats {
  total: number;
  superAdmins: number;
  platformEmployees: number;
  withOrganizations: number;
  activeLastWeek: number;
  activeLastMonth: number;
  neverLoggedIn: number;
}

// Format relative time (e.g., "2 hours ago", "3 days ago")
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "Never";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return date.toLocaleDateString();
}

// Get activity status based on last login
function getActivityStatus(lastSignIn: string | null): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (!lastSignIn) {
    return { label: "Never active", color: "text-gray-500", bgColor: "bg-gray-100" };
  }

  const date = new Date(lastSignIn);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return { label: "Active today", color: "text-green-700", bgColor: "bg-green-100" };
  }
  if (diffDays <= 7) {
    return { label: "Active this week", color: "text-blue-700", bgColor: "bg-blue-100" };
  }
  if (diffDays <= 30) {
    return { label: "Active this month", color: "text-amber-700", bgColor: "bg-amber-100" };
  }
  return { label: "Inactive", color: "text-gray-500", bgColor: "bg-gray-100" };
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
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
      setStats(data.stats || null);
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
          Manage platform users, track activity, and control access
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

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Users</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Crown className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.superAdmins}</p>
                <p className="text-xs text-muted-foreground">Super Admins</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <UserCog className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.platformEmployees}</p>
                <p className="text-xs text-muted-foreground">Employees</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withOrganizations}</p>
                <p className="text-xs text-muted-foreground">With Org</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeLastWeek}</p>
                <p className="text-xs text-muted-foreground">Active 7d</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-cyan-100 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.activeLastMonth}</p>
                <p className="text-xs text-muted-foreground">Active 30d</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.neverLoggedIn}</p>
                <p className="text-xs text-muted-foreground">Never Active</p>
              </div>
            </div>
          </Card>
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
            View and manage all registered users with activity tracking
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
              filteredUsers.map((user) => {
                const activityStatus = getActivityStatus(user.last_sign_in_at);

                return (
                  <div
                    key={user.id}
                    className="p-4 rounded-lg border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* User Info */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                            user.role === "super_admin"
                              ? "bg-amber-100"
                              : user.is_platform_employee
                              ? "bg-purple-100"
                              : "bg-primary/10"
                          }`}
                        >
                          {user.role === "super_admin" ? (
                            <Crown className="h-6 w-6 text-amber-600" />
                          ) : user.is_platform_employee ? (
                            <UserCog className="h-6 w-6 text-purple-600" />
                          ) : (
                            <User className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold truncate">
                              {user.full_name || user.email.split("@")[0]}
                            </p>
                            {user.role === "super_admin" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                                SUPER ADMIN
                              </span>
                            )}
                            {user.is_platform_employee && user.role !== "super_admin" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                EMPLOYEE
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {user.email}
                          </p>

                          {/* Organization */}
                          {user.organization && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {user.organization.name}
                              <span className="text-[10px] px-1 rounded bg-muted">
                                {user.org_role}
                              </span>
                            </p>
                          )}

                          {/* Activity Timeline */}
                          <div className="flex items-center gap-4 mt-2 text-xs">
                            <span className="text-muted-foreground flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              Joined {formatRelativeTime(user.created_at)}
                            </span>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Last login {formatRelativeTime(user.last_sign_in_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-medium ${activityStatus.bgColor} ${activityStatus.color}`}
                        >
                          {activityStatus.label}
                        </span>

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
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
