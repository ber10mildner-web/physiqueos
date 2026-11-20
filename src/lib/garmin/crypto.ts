import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

/**
 * AES-256-GCM. Key: GARMIN_TOKEN_KEY (32 bytes, base64) if set, otherwise derived
 * (HKDF-SHA256) from the server-only SUPABASE_SECRET_KEY, so a database dump alone
 * never reveals the tokens. Format: v1.<iv>.<tag>.<ciphertext>
 */
function key(): Buffer {
  const raw = process.env.GARMIN_TOKEN_KEY;
  if (!raw) {
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) throw new Error("GARMIN_TOKEN_KEY / SUPABASE_SECRET_KEY missing");
    return Buffer.from(hkdfSync("sha256", secret, "physiqueos", "garmin-tokens-v1", 32));
  }
  const k = Buffer.from(raw, "base64");
  if (k.length !== 32) throw new Error("GARMIN_TOKEN_KEY must be 32 bytes (base64)");
  return k;
}

export const isGarminKeyConfigured = () => {
  try {
    key();
    return true;
  } catch {
    return false;
  }
};

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(blob: string): string {
  const [v, iv, tag, data] = blob.split(".");
  if (v !== "v1" || !iv || !tag || data === undefined) throw new Error("bad token blob");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64url"));
  d.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([d.update(Buffer.from(data, "base64url")), d.final()]).toString("utf8");
}
