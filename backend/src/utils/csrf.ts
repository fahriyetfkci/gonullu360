import crypto from "crypto";
import { env } from "../config/env";

const DELIMITER = ".";
const HEX_REGEX = /^[a-f0-9]+$/i;

// Double-submit CSRF pattern:
// Server generates: token = random + "." + HMAC(random, secret)
// Cookie stores token (not httpOnly), request sends it back in X-CSRF-Token header.
// Server verifies HMAC matches before mutating state.

export function generateCsrfToken(): string {
  const random = crypto.randomBytes(24).toString("hex");
  const mac = crypto
    .createHmac("sha256", env.CSRF_SECRET)
    .update(random)
    .digest("hex");
  return `${random}${DELIMITER}${mac}`;
}

export function verifyCsrfToken(token: string): boolean {
  const parts = token.split(DELIMITER);
  if (parts.length !== 2) return false;

  const [random, mac] = parts;
  if (!random || !mac || !HEX_REGEX.test(random) || !HEX_REGEX.test(mac)) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", env.CSRF_SECRET)
    .update(random)
    .digest("hex");

  if (mac.length !== expected.length) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(Buffer.from(mac, "hex"), Buffer.from(expected, "hex"));
}

