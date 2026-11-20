import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PREFIX = "pos_";

/** A new personal access token: "pos_" + 32 random bytes (base64url). */
export function generateToken(): string {
  return PREFIX + randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isTokenFormat(token: string): boolean {
  return /^pos_[A-Za-z0-9_-]{43}$/.test(token);
}

export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** What we store and show later to identify a token without revealing it. */
export function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}
