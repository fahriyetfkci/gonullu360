process.env.CSRF_SECRET = "test_csrf_secret_at_least_32_chars_long_xxxx";

import { generateCsrfToken, verifyCsrfToken } from "../csrf";

describe("CSRF utils", () => {
  it("generates and verifies a valid CSRF token", () => {
    const token = generateCsrfToken();
    expect(verifyCsrfToken(token)).toBe(true);
  });

  it("rejects a tampered CSRF token", () => {
    const token = generateCsrfToken();
    const parts = token.split(".");
    const tampered = `${parts[0]}.deadbeefdeadbeef`;
    expect(verifyCsrfToken(tampered)).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(verifyCsrfToken("")).toBe(false);
  });

  it("rejects a token with missing delimiter", () => {
    expect(verifyCsrfToken("nodothere")).toBe(false);
  });

  it("generates unique tokens", () => {
    const t1 = generateCsrfToken();
    const t2 = generateCsrfToken();
    expect(t1).not.toBe(t2);
  });
});

