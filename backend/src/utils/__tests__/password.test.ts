import { hashPassword, validatePasswordStrength, verifyPassword } from "../password";

describe("password utils", () => {
  describe("validatePasswordStrength", () => {
    it("accepts strong passwords", () => {
      expect(validatePasswordStrength("Str0ng!Pass")).toBe(true);
      expect(validatePasswordStrength("MyP@ssw0rd")).toBe(true);
    });

    it("rejects weak passwords", () => {
      expect(validatePasswordStrength("short")).toBe(false);
      expect(validatePasswordStrength("alllowercase1!")).toBe(false);
      expect(validatePasswordStrength("ALLUPPERCASE1!")).toBe(false);
      expect(validatePasswordStrength("NoSpecialChar1")).toBe(false);
      expect(validatePasswordStrength("NoNumber!Pass")).toBe(false);
    });
  });

  describe("hashPassword + verifyPassword", () => {
    it("hashes and verifies correctly", async () => {
      const password = "Str0ng!Pass";
      const hash = await hashPassword(password);

      expect(hash).not.toBe(password);
      await expect(verifyPassword(hash, password)).resolves.toBe(true);
      await expect(verifyPassword(hash, "WrongPass!1")).resolves.toBe(false);
    });

    it("produces different hashes for the same password (salt)", async () => {
      const password = "Str0ng!Pass";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });
});

