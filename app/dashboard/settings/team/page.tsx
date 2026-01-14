"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  Loader2,
  UserPlus,
  Users,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  Crown,
  User,
  Trash2,
  Send,
} from "lucide-react";

interface Member {
  id: string;
  user_id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
  profile?: {
    full_name: string | null;
  };
}

interface Invitation {
  id: string;
  email: string;
  role: "admin" | "member";
  status: string;
  created_at: string;
  expires_at: string;
  inviter_name: string | null;
}

export default function TeamPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/auth/permissions");
        const data = await res.json();

        if (!data.authenticated) {
          router.push("/sign-in");
          return;
        }

        if (data.orgRole !== "admin") {
          router.push("/dashboard");
          return;
        }

        setIsAdmin(true);
        await Promise.all([loadMembers(), loadInvitations()]);
      } catch {
        setError("Failed to load team data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const loadMembers = async () => {
    try {
      const res = await fetch("/api/organization/members");
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      console.error("Failed to load members");
    }
  };

  const loadInvitations = async () => {
    try {
      const res = await fetch("/api/invitations");
      if (res.ok) {
        const data = await res.json();
        setInvitations(
          (data.invitations || []).filter(
            (inv: Invitation) => inv.status === "pending"
          )
        );
      }
    } catch {
      console.error("Failed to load invitations");
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send invitation");
        return;
      }

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("member");
      await loadInvitations();
    } catch {
      setError("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const res = await fetch(`/api/invitations?id=${invitationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to revoke invitation");
        return;
      }

      await loadInvitations();
      setSuccess("Invitation revoked");
    } catch {
      setError("Failed to revoke invitation");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) {
      return;
    }

    try {
      const res = await fetch(`/api/organization/members?id=${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to remove member");
        return;
      }

      await loadMembers();
      setSuccess("Member removed");
    } catch {
      setError("Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">
          Invite team members and manage their access
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite Team Member
            </CardTitle>
            <CardDescription>
              Send an invitation to join your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(value: "admin" | "member") =>
                    setInviteRole(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Member
                      </div>
                    </SelectItem>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4" />
                        Admin
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Admins can invite members and manage settings
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={inviting}>
                {inviting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invitation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Members & Invitations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Members */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({members.length})
              </CardTitle>
              <CardDescription>
                People who have access to your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No team members yet
                </p>
              ) : (
                <div className="space-y-3">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {member.role === "admin" ? (
                            <Crown className="h-5 w-5 text-primary" />
                          ) : (
                            <User className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.profile?.full_name || member.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            member.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {member.role}
                        </span>
                        {members.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Invitations */}
          {invitations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Pending Invitations ({invitations.length})
                </CardTitle>
                <CardDescription>
                  Invitations waiting to be accepted
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-dashed"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-xs text-muted-foreground">
                            Expires{" "}
                            {new Date(invitation.expires_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            invitation.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {invitation.role}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
