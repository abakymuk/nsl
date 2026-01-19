"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Building2,
  Clock,
  XCircle,
  LogOut,
  Shield,
} from "lucide-react";

interface InvitationData {
  id: string;
  email: string;
  role: string;
  status: string;
  inviterName: string | null;
  organizationId: string;
  organizationName: string;
  expiresAt: string;
  // Platform admin invitation fields
  platformRole?: string;
  isPlatformInvite?: boolean;
}

export default function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuthAndLoadInvitation = async () => {
      const supabase = createClient();

      // Check current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
      setUserEmail(user?.email || null);

      // Load invitation
      try {
        const res = await fetch(`/api/invitations/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invitation not found");
        } else {
          setInvitation(data.invitation);
        }
      } catch {
        setError("Failed to load invitation");
      }

      setLoading(false);
    };

    checkAuthAndLoadInvitation();
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.invitedEmail && userEmail !== data.invitedEmail) {
          setError(
            `This invitation was sent to ${data.invitedEmail}. Please sign out and sign in with that email.`
          );
        } else {
          setError(data.error || "Failed to accept invitation");
        }
        setAccepting(false);
        return;
      }

      // Success - redirect to dashboard
      router.push(data.redirect || "/dashboard");
      router.refresh();
    } catch {
      setError("Failed to accept invitation");
      setAccepting(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or error state
  if (error && !invitation) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Invalid Invitation
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Link href="/sign-in" className="w-full">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Expired invitation
  if (invitation?.status === "expired") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Invitation Expired
            </CardTitle>
            <CardDescription>
              This invitation to join {invitation.organizationName} has expired.
              Please ask {invitation.inviterName || "the administrator"} to send
              a new invitation.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Go to Homepage
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Already accepted
  if (invitation?.status === "accepted") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Already Accepted
            </CardTitle>
            <CardDescription>
              This invitation has already been accepted.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Link href="/dashboard" className="w-full">
              <Button className="w-full">Go to Dashboard</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Revoked
  if (invitation?.status === "revoked") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-gray-600" />
            </div>
            <CardTitle className="text-2xl font-bold">
              Invitation Revoked
            </CardTitle>
            <CardDescription>
              This invitation has been cancelled by the administrator.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-3">
            <Link href="/" className="w-full">
              <Button variant="outline" className="w-full">
                Go to Homepage
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Valid pending invitation
  const emailMatches =
    userEmail?.toLowerCase() === invitation?.email.toLowerCase();
  const isPlatformInvite = invitation?.isPlatformInvite;

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className={`mx-auto mb-4 h-12 w-12 rounded-full flex items-center justify-center ${
            isPlatformInvite ? "bg-amber-100" : "bg-primary/10"
          }`}>
            {isPlatformInvite ? (
              <Shield className="h-6 w-6 text-amber-600" />
            ) : (
              <Building2 className="h-6 w-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            You&apos;re invited!
          </CardTitle>
          <CardDescription className="text-base">
            {invitation?.inviterName
              ? `${invitation.inviterName} has invited you`
              : "You've been invited"}{" "}
            {isPlatformInvite ? (
              <>to become a <strong>Platform Administrator</strong> on New Stream Logistics.</>
            ) : (
              <>to join <strong>{invitation?.organizationName}</strong> as a {invitation?.role}.</>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-lg space-y-2">
            {isPlatformInvite ? (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Access Level</span>
                  <span className="text-sm font-medium text-amber-600">Platform Administrator</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invited Email</span>
                  <span className="text-sm font-medium">{invitation?.email}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Organization</span>
                  <span className="text-sm font-medium">{invitation?.organizationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Your Role</span>
                  <span className="text-sm font-medium capitalize">{invitation?.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invited Email</span>
                  <span className="text-sm font-medium">{invitation?.email}</span>
                </div>
              </>
            )}
          </div>

          {isLoggedIn && !emailMatches && (
            <div className="flex items-start gap-2 p-3 text-sm text-amber-700 bg-amber-50 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p>
                  You&apos;re signed in as <strong>{userEmail}</strong>, but this
                  invitation was sent to <strong>{invitation?.email}</strong>.
                </p>
                <p className="mt-1">
                  Please sign out and sign in with the correct email.
                </p>
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          {isLoggedIn && emailMatches && (
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Accept Invitation
                </>
              )}
            </Button>
          )}

          {isLoggedIn && !emailMatches && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          )}

          {!isLoggedIn && (
            <>
              <Link
                href={`/sign-up?invite=${token}`}
                className="w-full"
              >
                <Button className="w-full">Create Account to Join</Button>
              </Link>
              <Link href={`/sign-in?redirect=/invite/${token}`} className="w-full">
                <Button variant="outline" className="w-full">
                  Sign In to Join
                </Button>
              </Link>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
