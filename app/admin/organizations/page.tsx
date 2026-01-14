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
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
  Crown,
  User,
  Mail,
  Globe,
} from "lucide-react";

interface OrgMember {
  id: string;
  email: string;
  role: "admin" | "member";
  profile?: {
    full_name: string | null;
  };
}

interface Organization {
  id: string;
  name: string;
  slug: string | null;
  email_domain: string | null;
  primary_email: string | null;
  created_at: string;
  member_count: number;
  members?: OrgMember[];
}

export default function OrganizationsPage() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      const res = await fetch("/api/admin/organizations");
      if (!res.ok) {
        setError("Failed to load organizations");
        return;
      }
      const data = await res.json();
      setOrganizations(data.organizations || []);
    } catch {
      setError("Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  const loadOrgMembers = async (orgId: string) => {
    setLoadingMembers(orgId);
    try {
      const res = await fetch(`/api/admin/organizations/${orgId}/members`);
      if (res.ok) {
        const data = await res.json();
        setOrganizations((orgs) =>
          orgs.map((org) =>
            org.id === orgId ? { ...org, members: data.members } : org
          )
        );
      }
    } catch {
      console.error("Failed to load members");
    } finally {
      setLoadingMembers(null);
    }
  };

  const toggleExpand = async (orgId: string) => {
    if (expandedOrg === orgId) {
      setExpandedOrg(null);
    } else {
      setExpandedOrg(orgId);
      const org = organizations.find((o) => o.id === orgId);
      if (!org?.members) {
        await loadOrgMembers(orgId);
      }
    }
  };

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.email_domain?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <h1 className="text-2xl font-bold">Organizations</h1>
        <p className="text-muted-foreground">
          View and manage all organizations on the platform
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Organizations ({organizations.length})</CardTitle>
          <CardDescription>
            View organization details and members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or domain..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredOrgs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No organizations found
              </p>
            ) : (
              filteredOrgs.map((org) => (
                <div key={org.id} className="rounded-lg border">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(org.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {org.email_domain && (
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {org.email_domain}
                            </span>
                          )}
                          {org.primary_email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {org.primary_email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {org.member_count} member
                        {org.member_count !== 1 ? "s" : ""}
                      </span>
                      <Button variant="ghost" size="sm">
                        {expandedOrg === org.id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {expandedOrg === org.id && (
                    <div className="border-t px-4 py-3 bg-muted/30">
                      <p className="text-sm font-medium mb-3">Members</p>
                      {loadingMembers === org.id ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : org.members && org.members.length > 0 ? (
                        <div className="space-y-2">
                          {org.members.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-2 rounded bg-card"
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                    member.role === "admin"
                                      ? "bg-amber-100"
                                      : "bg-muted"
                                  }`}
                                >
                                  {member.role === "admin" ? (
                                    <Crown className="h-4 w-4 text-amber-600" />
                                  ) : (
                                    <User className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">
                                    {member.profile?.full_name || member.email}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {member.email}
                                  </p>
                                </div>
                              </div>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  member.role === "admin"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {member.role}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No members found
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
