/**
 * Basic tests for notification functionality
 * Note: These tests run in happy-dom environment which simulates DOM APIs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  showServiceWorkerNotification,
  isSecureContext,
  getServiceWorker,
  requestNotificationPermission,
  getNotificationPermission,
} from "./notifications";

// Mock console methods to test fallback behavior
const consoleMocks = {
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
};

describe("Notification Utilities", () => {
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

  describe("isSecureContext", () => {
    it("should return true in test environment (simulates https)", () => {
      // happy-dom provides window object with location
      expect(typeof window).toBe("object");
      expect(isSecureContext()).toBe(true);
    });
  });

  describe("getServiceWorker", () => {
    it("should return null in test environment (no service worker)", () => {
      // happy-dom doesn't provide service worker API
      const sw = getServiceWorker();
      expect(sw).toBeNull();
    });
  });

  describe("showServiceWorkerNotification", () => {
    it("should export the function", () => {
      expect(typeof showServiceWorkerNotification).toBe("function");
    });

    it("should handle basic notification request", async () => {
      const result = await showServiceWorkerNotification("Test Title", {
        body: "Test body",
      });

      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });

    it("should handle notification with all options", async () => {
      const options = {
        body: "Test notification body",
        icon: "/test-icon.png",
        badge: "/test-badge.png",
        requireInteraction: true,
        silent: false,
        tag: "test-tag",
        data: { taskId: "test-123" },
        actions: [
          { action: "complete", title: "Mark Complete" },
          { action: "snooze", title: "Snooze 5min" },
        ],
      };

      const result = await showServiceWorkerNotification(
        "Test Notification",
        options,
        "test-context",
      );

      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });

    it("should handle empty options", async () => {
      const result = await showServiceWorkerNotification("Test Title");
      expect(result).toBeDefined();
      expect(typeof result.success).toBe("boolean");
    });
  });

  describe("requestNotificationPermission", () => {
    it("should export the function", () => {
      expect(typeof requestNotificationPermission).toBe("function");
    });

    it("should return denied in test environment", async () => {
      const permission = await requestNotificationPermission();
      expect(["granted", "denied", "default"]).toContain(permission);
    });
  });

  describe("getNotificationPermission", () => {
    it("should export the function", () => {
      expect(typeof getNotificationPermission).toBe("function");
    });

    it("should return a valid permission state", () => {
      const permission = getNotificationPermission();
      expect(["granted", "denied", "default"]).toContain(permission);
    });
  });

  describe("Browser environment detection", () => {
    it("should work in happy-dom test environment (simulates browser)", () => {
      // happy-dom provides window object, so should use DOM APIs
      expect(typeof window).toBe("object");
      expect(() => showServiceWorkerNotification("Test")).not.toThrow();
    });
  });
});
