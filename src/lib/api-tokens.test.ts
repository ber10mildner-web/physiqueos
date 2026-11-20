import { describe, expect, it } from "vitest";
import { generateToken, hashToken, isTokenFormat, safeEqualHex, tokenPrefix } from "./api-tokens";

describe("api tokens", () => {
  it("generates unique, well-formed tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(isTokenFormat(a)).toBe(true);
    expect(isTokenFormat("pos_short")).toBe(false);
    expect(tokenPrefix(a)).toBe(a.slice(0, 8));
  });

  it("hashes deterministically to 64 hex chars", () => {
    const t = generateToken();
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t)).toBe(hashToken(t));
    expect(safeEqualHex(hashToken(t), hashToken(t))).toBe(true);
    expect(safeEqualHex(hashToken(t), hashToken(generateToken()))).toBe(false);
  });
});
