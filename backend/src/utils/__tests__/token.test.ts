import { Role } from "@prisma/client";
import {
  generateSecureToken,
  hashToken,
  signAccessToken,
  verifyAccessToken,
} from "../token";

describe("token utils", () => {
  const payload = {
    sub: "user-1",
    orgId: "org-1",
    email: "test@example.com",
    role: "VOLUNTEER" as Role,
    sessionId: "session-1",
  };

  it("signs and verifies access token", () => {
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toBe(payload.sub);
    expect(decoded.orgId).toBe(payload.orgId);
    expect(decoded.role).toBe(payload.role);
  });

  it("throws on tampered access token", () => {
    const token = signAccessToken(payload);
    expect(() => verifyAccessToken(token + "tampered")).toThrow();
  });

  it("hashToken is deterministic", () => {
    const raw = "my-secret-token";
    expect(hashToken(raw)).toBe(hashToken(raw));
  });

  it("hashToken hides original value", () => {
    const raw = "my-secret-token";
    expect(hashToken(raw)).not.toBe(raw);
  });

  it("generateSecureToken returns hex string of correct length", () => {
    const token = generateSecureToken(32);
    expect(token).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
  });
});

