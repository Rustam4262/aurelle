import { createHash, timingSafeEqual } from "crypto";

/**
 * Constant-time string comparison for secrets/signatures of unknown or
 * mismatched length (e.g. a password or hex digest from an external webhook).
 * Hashing first gives both inputs a fixed 32-byte length, so timingSafeEqual
 * never throws on a length mismatch and never leaks length via timing.
 */
export function timingSafeEqualStrings(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}
