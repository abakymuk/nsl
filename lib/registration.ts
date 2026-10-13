import { z } from "zod";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export const registrationSchema = z.object({
  fullName: z.string().trim().max(200).optional(),
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128),
  orgAction: z.enum(["create", "join", "skip"]).default("skip"),
  orgName: z.string().trim().min(1).max(200).optional(),
  orgId: z.uuid().optional(),
  invitationToken: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
}).superRefine((value, ctx) => {
  if (value.orgAction === "join" && !value.invitationToken) {
    ctx.addIssue({ code: "custom", message: "An invitation is required to join a team", path: ["invitationToken"] });
  }
  if (value.orgAction === "create" && !value.orgName) {
    ctx.addIssue({ code: "custom", message: "Organization name is required", path: ["orgName"] });
  }
});

// Metadata is an untrusted onboarding hint, never an authorization decision.
// The RPCs independently validate the signed-in, verified recipient.
export async function completeRegistration(client: SupabaseClient, user: User) {
  if (!user.email_confirmed_at) throw new Error("Please verify your email first");
  const intent = user.user_metadata?.registration;
  if (!intent || typeof intent !== "object") return;
  let error;
  if (intent.orgAction === "join" && typeof intent.invitationToken === "string") {
    ({ error } = await client.rpc("accept_verified_invitation", { p_token: intent.invitationToken }));
  } else if (intent.orgAction === "create" && typeof intent.orgName === "string") {
    ({ error } = await client.rpc("create_verified_organization", { p_name: intent.orgName }));
  }
  if (error) throw new Error("Unable to finish team setup. Please open your invitation again or contact support.");
  await client.auth.updateUser({ data: { registration: null } });
}
