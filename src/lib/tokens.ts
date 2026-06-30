import crypto from "crypto";

/**
 * Generate a cryptographically secure, URL-safe random token.
 * Used for confirmation and unsubscribe tokens in price alert subscriptions.
 * Produces a 32-byte random value encoded as base64url (43 characters).
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}
