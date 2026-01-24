/**
 * Quote Token Service
 *
 * Manages secure tokens for public quote access (status viewing and acceptance).
 * Tokens are 64-character hex strings (32 random bytes).
 */

import { createUntypedAdminClient } from "@/lib/supabase/server";
import { QuoteToken, QuoteTokenType, Quote } from "@/types/database";
import crypto from "crypto";

// Token validity periods in hours
export const TOKEN_VALIDITY = {
  status: 24 * 30, // 30 days for status tokens
  accept: 24 * 7, // 7 days for accept tokens (matches quote validity)
} as const;

/**
 * Generate a cryptographically secure 64-char hex token
 */
export function generateTokenString(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a status token for a quote (allows viewing quote status)
 */
export async function createStatusToken(quoteId: string): Promise<string | null> {
  const supabase = createUntypedAdminClient();

  const token = generateTokenString();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + TOKEN_VALIDITY.status);

  const { error } = await supabase.from("quote_tokens").insert({
    quote_id: quoteId,
    token,
    type: "status" as QuoteTokenType,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("Failed to create status token:", error);
    return null;
  }

  return token;
}

/**
 * Create an accept token for a quote (allows accepting/rejecting)
 */
export async function createAcceptToken(
  quoteId: string,
  validityHours?: number
): Promise<string | null> {
  const supabase = createUntypedAdminClient();

  const token = generateTokenString();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + (validityHours || TOKEN_VALIDITY.accept));

  const { error } = await supabase.from("quote_tokens").insert({
    quote_id: quoteId,
    token,
    type: "accept" as QuoteTokenType,
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    console.error("Failed to create accept token:", error);
    return null;
  }

  return token;
}

/**
 * Validate a token and return the associated quote
 * Returns null if token is invalid, expired, or already used
 */
export async function validateToken(
  token: string,
  expectedType: QuoteTokenType
): Promise<{ quote: Quote; tokenRecord: QuoteToken } | null> {
  const supabase = createUntypedAdminClient();

  // Fetch token record
  const { data: tokenRecord, error: tokenError } = await supabase
    .from("quote_tokens")
    .select("*")
    .eq("token", token)
    .eq("type", expectedType)
    .single();

  if (tokenError || !tokenRecord) {
    return null;
  }

  // Check if expired
  if (new Date(tokenRecord.expires_at) < new Date()) {
    return null;
  }

  // For accept tokens, check if already used
  if (expectedType === "accept" && tokenRecord.used_at) {
    return null;
  }

  // Fetch associated quote
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", tokenRecord.quote_id)
    .single();

  if (quoteError || !quote) {
    return null;
  }

  return { quote, tokenRecord };
}

/**
 * Mark an accept token as used
 */
export async function markTokenUsed(tokenId: string): Promise<boolean> {
  const supabase = createUntypedAdminClient();

  const { error } = await supabase
    .from("quote_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", tokenId)
    .is("used_at", null); // Only update if not already used

  return !error;
}

/**
 * Revoke all tokens for a quote (e.g., when quote is cancelled)
 */
export async function revokeTokensForQuote(quoteId: string): Promise<boolean> {
  const supabase = createUntypedAdminClient();

  // Set expires_at to now to effectively revoke
  const { error } = await supabase
    .from("quote_tokens")
    .update({ expires_at: new Date().toISOString() })
    .eq("quote_id", quoteId)
    .gt("expires_at", new Date().toISOString());

  return !error;
}

/**
 * Get existing valid status token for a quote, or create new one
 */
export async function getOrCreateStatusToken(quoteId: string): Promise<string | null> {
  const supabase = createUntypedAdminClient();

  // Check for existing valid token
  const { data: existingToken } = await supabase
    .from("quote_tokens")
    .select("token")
    .eq("quote_id", quoteId)
    .eq("type", "status")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingToken) {
    return existingToken.token;
  }

  // Create new token
  return createStatusToken(quoteId);
}

/**
 * Get existing valid accept token for a quote, or create new one
 */
export async function getOrCreateAcceptToken(
  quoteId: string,
  validityHours?: number
): Promise<string | null> {
  const supabase = createUntypedAdminClient();

  // Check for existing valid, unused token
  const { data: existingToken } = await supabase
    .from("quote_tokens")
    .select("token")
    .eq("quote_id", quoteId)
    .eq("type", "accept")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (existingToken) {
    return existingToken.token;
  }

  // Create new token
  return createAcceptToken(quoteId, validityHours);
}

/**
 * Build the public URL for a quote status page
 */
export function buildStatusUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${baseUrl}/quote/status/${token}`;
}

/**
 * Build the public URL for quote acceptance page
 */
export function buildAcceptUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return `${baseUrl}/quote/accept/${token}`;
}
