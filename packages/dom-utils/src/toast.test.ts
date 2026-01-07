/**
 * Basic tests for toast functionality
 * Note: These tests run in happy-dom environment which simulates DOM APIs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  toast,
  sonner,
  setToastImplementation,
  resetToastImplementation,
} from "./toast";

// Mock console methods to test fallback behavior
const consoleMocks = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe("Toast Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on console methods
    vi.spyOn(console, "log").mockImplementation(consoleMocks.log);
    vi.spyOn(console, "error").mockImplementation(consoleMocks.error);
    vi.spyOn(console, "warn").mockImplementation(consoleMocks.warn);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should export toast object with required methods", () => {
    expect(toast).toBeDefined();
    expect(typeof toast.success).toBe("function");
    expect(typeof toast.error).toBe("function");
    expect(typeof toast.info).toBe("function");
    expect(typeof toast.warning).toBe("function");
  });

  it("should export sonner for advanced usage", () => {
    expect(sonner).toBeDefined();
    expect(typeof sonner).toBe("function");
  });

  describe("Toast methods", () => {
    it("should handle success toast", () => {
      expect(() => toast.success("Test success message")).not.toThrow();
    });

    it("should handle error toast", () => {
      expect(() => toast.error("Test error message")).not.toThrow();
    });

    it("should handle info toast", () => {
      expect(() => toast.info("Test info message")).not.toThrow();
    });

    it("should handle warning toast", () => {
      expect(() => toast.warning("Test warning message")).not.toThrow();
    });
  });

  describe("Browser environment detection", () => {
    it("should work in happy-dom test environment (simulates browser)", () => {
      // happy-dom provides window object, so should use sonner
      expect(typeof window).toBe("object");
      expect(() => toast.success("Test message")).not.toThrow();
    });
  });

  describe("Custom implementation swapping", () => {
    afterEach(() => {
      resetToastImplementation();
    });

    it("delegates to the registered implementation", () => {
      const success = vi.fn();
      const impl = {
        success,
        error: vi.fn(),
        info: vi.fn(),
        warning: vi.fn(),
      };

      setToastImplementation(impl);

      const msg = "Hello mobile";
      toast.success(msg);
      expect(success).toHaveBeenCalledWith(msg, undefined);
    });
  });
});
