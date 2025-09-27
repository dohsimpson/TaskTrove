import { describe, it, expect } from "vitest";
import { saltAndHashPassword, verifyPassword } from "./encryption";

describe("Encryption utilities", () => {
  describe("saltAndHashPassword", () => {
    it("should hash a password and return bcrypt format", () => {
      const password = "testpassword123";
      const hashed = saltAndHashPassword(password);

      // bcrypt hash format: $2a$rounds$salt+hash (60 characters total)
      expect(hashed).toMatch(/^\$2[abyxy]?\$\d{2}\$.{53}$/);
      expect(hashed.length).toBe(60);
    });

    it("should generate different hashes for same password (salt is random)", () => {
      const password = "testpassword123";
      const hash1 = saltAndHashPassword(password);
      const hash2 = saltAndHashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it("should accept custom salt rounds", () => {
      const password = "testpassword123";
      const hash = saltAndHashPassword(password, 10);

      // Should contain the salt rounds in the hash
      expect(hash).toMatch(/^\$2[abyxy]?\$10\$/);
    });

    it("should throw error for empty data", () => {
      expect(() => saltAndHashPassword("")).toThrow("Data must not be empty");
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password", () => {
      const password = "testpassword123";
      const hashed = saltAndHashPassword(password);

      expect(verifyPassword(password, hashed)).toBe(true);
    });

    it("should reject incorrect password", () => {
      const password = "testpassword123";
      const hashed = saltAndHashPassword(password);

      expect(verifyPassword("wrongpassword", hashed)).toBe(false);
    });

    it("should return true when both password and hash are undefined", () => {
      expect(verifyPassword(undefined, undefined)).toBe(true);
    });

    it("should return false when password is undefined but hash exists", () => {
      const hashed = saltAndHashPassword("somepassword");
      expect(verifyPassword(undefined, hashed)).toBe(false);
    });

    it("should return false when hash is undefined but password exists", () => {
      expect(verifyPassword("somepassword", undefined)).toBe(false);
    });

    it("should handle edge cases with special characters in password", () => {
      const password = "p@ssw0rd!@#$%^&*()_+";
      const hashed = saltAndHashPassword(password);

      expect(verifyPassword(password, hashed)).toBe(true);
      expect(verifyPassword("different", hashed)).toBe(false);
    });

    it("should handle unicode characters in password", () => {
      const password = "🔒🗝️密码测试";
      const hashed = saltAndHashPassword(password);

      expect(verifyPassword(password, hashed)).toBe(true);
      expect(verifyPassword("different", hashed)).toBe(false);
    });
  });
});
