"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Users,
  ArrowRight,
  ArrowLeft,
  Mail,
  Sparkles,
  Ticket,
} from "lucide-react";

type Step = "account" | "organization" | "complete";

interface OrgOption {
  type: "invitation" | "domain" | "create" | "invite-code";
  organizationId?: string;
  organizationName?: string;
  inviterName?: string;
  role?: string;
  token?: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");

  // Step state
  const [step, setStep] = useState<Step>("account");

  // Account form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Organization state
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);
  const [selectedOrgOption, setSelectedOrgOption] = useState<OrgOption | null>(null);
  const [newOrgName, setNewOrgName] = useState("");
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [manualInviteCode, setManualInviteCode] = useState("");
  const [checkingInviteCode, setCheckingInviteCode] = useState(false);

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check for invitation on mount
  useEffect(() => {
    if (inviteToken) {
      checkInvitation(inviteToken);
    }
  }, [inviteToken]);

  const checkInvitation = async (token: string) => {
    try {
      const res = await fetch(`/api/invitations/${token}`);
      if (res.ok) {
        const data = await res.json();
        if (data.invitation) {
          setEmail(data.invitation.email);
          setOrgOptions([
            {
              type: "invitation",
              organizationId: data.invitation.organizationId,
              organizationName: data.invitation.organizationName,
              inviterName: data.invitation.inviterName,
              role: data.invitation.role,
              token,
            },
          ]);
        }
      }
    } catch {
      // Ignore errors, user can still sign up normally
    }
  };

  const checkEmailForOrg = async () => {
    if (!email) return;

    setCheckingEmail(true);
    try {
      const res = await fetch(`/api/auth/signup?email=${encodeURIComponent(email)}`);
      const data = await res.json();

      const options: OrgOption[] = [];

      if (data.hasInvitation && data.invitation) {
        options.push({
          type: "invitation",
          organizationId: data.invitation.organizationId,
          organizationName: data.invitation.organizationName,
          inviterName: data.invitation.inviterName,
          role: data.invitation.role,
          token: data.invitation.token,
        });
      }

      if (data.hasDomainMatch && data.organization) {
        options.push({
          type: "domain",
          organizationId: data.organization.id,
          organizationName: data.organization.name,
        });
      }

      // Always allow creating new org
      options.push({ type: "create" });

      setOrgOptions(options);

      // Auto-select if only one real option (invitation or domain)
      if (options.length === 2 && options[0].type !== "create") {
        setSelectedOrgOption(options[0]);
      }
    } catch {
      setOrgOptions([{ type: "create" }]);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleCheckInviteCode = async () => {
    if (!manualInviteCode.trim()) return;

    setCheckingInviteCode(true);
    setError(null);

    try {
      const res = await fetch(`/api/invitations/${manualInviteCode.trim()}`);
      const data = await res.json();

      if (!res.ok || !data.invitation) {
        setError("Invalid or expired invitation code");
        setCheckingInviteCode(false);
        return;
      }

      const inv = data.invitation;

      // Check if email matches
      if (inv.email.toLowerCase() !== email.toLowerCase()) {
        setError(`This invitation is for ${inv.email}. Please use that email address.`);
        setCheckingInviteCode(false);
        return;
      }

      // Add invitation to options and select it
      const invOption: OrgOption = {
        type: "invitation",
        organizationId: inv.organizationId,
        organizationName: inv.organizationName,
        inviterName: inv.inviterName,
        role: inv.role,
        token: manualInviteCode.trim(),
      };

      setOrgOptions((prev) => {
        // Remove any existing invitation and add new one at the start
        const filtered = prev.filter((o) => o.type !== "invitation");
        return [invOption, ...filtered];
      });
      setSelectedOrgOption(invOption);
      setManualInviteCode("");
    } catch {
      setError("Failed to verify invitation code");
    } finally {
      setCheckingInviteCode(false);
    }
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    // Check for org options
    await checkEmailForOrg();
    setStep("organization");
  };

  const handleOrgSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      let orgAction: string = "skip";
      let orgId: string | undefined;
      let orgName: string | undefined;
      let invitationToken: string | undefined;

      if (selectedOrgOption) {
        if (selectedOrgOption.type === "create") {
          if (!newOrgName.trim()) {
            setError("Please enter an organization name");
            setLoading(false);
            return;
          }
          orgAction = "create";
          orgName = newOrgName.trim();
        } else {
          orgAction = "join";
          orgId = selectedOrgOption.organizationId;
          invitationToken = selectedOrgOption.token;
        }
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          orgAction,
          orgName,
          orgId,
          invitationToken,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account");
        setLoading(false);
        return;
      }

      // Sign in the user
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Account created but couldn't auto-sign in
        setStep("complete");
        setLoading(false);
        return;
      }

      // Redirect based on result
      router.push(data.redirect || "/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleBack = () => {
    setError(null);
    if (step === "organization") {
      setStep("account");
    }
  };

  // Complete step (email verification needed)
  if (step === "complete") {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Account Created!</CardTitle>
            <CardDescription>
              Your account has been created successfully. Please check your email to verify your account.
            </CardDescription>
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

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        {/* Progress indicator */}
        <div className="px-6 pt-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div
              className={`h-2 w-16 rounded-full transition-colors ${
                step === "account" ? "bg-primary" : "bg-primary"
              }`}
            />
            <div
              className={`h-2 w-16 rounded-full transition-colors ${
                step === "organization" ? "bg-primary" : "bg-muted"
              }`}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Step {step === "account" ? "1" : "2"} of 2
          </p>
        </div>

        {step === "account" && (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Create your account</CardTitle>
              <CardDescription>
                Enter your details to get started
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleAccountSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={!!inviteToken}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={checkingEmail}>
                  {checkingEmail ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link href="/sign-in" className="text-primary hover:underline">
                    Sign in
                  </Link>
                </p>
              </CardFooter>
            </form>
          </>
        )}

        {step === "organization" && (
          <>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl font-bold">Set up your workspace</CardTitle>
              <CardDescription>
                Join an existing organization or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-3">
                {orgOptions.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedOrgOption(option)}
                    className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                      selectedOrgOption?.type === option.type &&
                      selectedOrgOption?.organizationId === option.organizationId
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    disabled={loading}
                  >
                    {option.type === "invitation" && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                          <Mail className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            Join {option.organizationName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {option.inviterName
                              ? `Invited by ${option.inviterName} as ${option.role}`
                              : `You've been invited as ${option.role}`}
                          </p>
                        </div>
                      </div>
                    )}

                    {option.type === "domain" && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            Join {option.organizationName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Your email domain matches this organization
                          </p>
                        </div>
                      </div>
                    )}

                    {option.type === "create" && (
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Create new organization</p>
                          <p className="text-sm text-muted-foreground">
                            Start fresh and invite your team later
                          </p>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* New org name input */}
              {selectedOrgOption?.type === "create" && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    type="text"
                    placeholder="Your Company Name"
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    disabled={loading}
                  />
                </div>
              )}

              {/* Invite code input - show when no invitation/domain match found */}
              {!orgOptions.some((o) => o.type === "invitation" || o.type === "domain") && (
                <div className="border-t pt-4 mt-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Have an invitation code?
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Enter invite code"
                      value={manualInviteCode}
                      onChange={(e) => setManualInviteCode(e.target.value)}
                      disabled={loading || checkingInviteCode}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCheckInviteCode}
                      disabled={loading || checkingInviteCode || !manualInviteCode.trim()}
                    >
                      {checkingInviteCode ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Verify"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <div className="flex gap-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={loading}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleOrgSubmit}
                  disabled={loading || !selectedOrgOption}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Complete
                    </>
                  )}
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
