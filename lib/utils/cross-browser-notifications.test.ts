/**
 * @vitest-environment jsdom
 */

/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  showCrossBrowserNotification,
  getNotificationCapabilities,
  requestNotificationPermission,
} from "./cross-browser-notifications"
import * as logger from "./logger"

// Mock the logger
vi.mock("./logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock ServiceWorkerRegistration
const mockShowNotification = vi.fn()
const mockServiceWorkerRegistration = {
  showNotification: mockShowNotification,
}

// Mock navigator.serviceWorker
const mockServiceWorker = {
  ready: Promise.resolve(mockServiceWorkerRegistration),
  register: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}

// Mock for Notification.requestPermission - declared outside so tests can access it
const mockRequestPermission = vi.fn()

describe("cross-browser-notifications", () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    mockShowNotification.mockClear()

    // Reset and setup mock
    mockRequestPermission.mockReset().mockResolvedValue("granted")

    // Mock global Notification
    global.Notification = {
      requestPermission: mockRequestPermission,
    } as any

    // Mock permission as a getter that can be overridden
    Object.defineProperty(global.Notification, "permission", {
      value: "granted",
      writable: true,
      configurable: true,
    })

    // Mock navigator.serviceWorker
    Object.defineProperty(global.navigator, "serviceWorker", {
      value: mockServiceWorker,
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("showCrossBrowserNotification", () => {
    it("should use service worker method when available", async () => {
      mockShowNotification.mockResolvedValue(undefined)

      const result = await showCrossBrowserNotification(
        "Test Title",
        { body: "Test body" },
        "test-context",
      )

      expect(result.success).toBe(true)
      expect(result.method).toBe("service-worker")
      expect(mockShowNotification).toHaveBeenCalledWith("Test Title", {
        body: "Test body",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        requireInteraction: false,
        silent: false,
        tag: undefined,
        data: undefined,
      })
    })

    it("should handle service worker errors gracefully", async () => {
      const error = new Error("Service worker failed")
      mockShowNotification.mockRejectedValue(error)

      const result = await showCrossBrowserNotification(
        "Test Title",
        { body: "Test body" },
        "test-context",
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Service worker failed")
      expect(logger.log.error).toHaveBeenCalled()
    })

    it("should return error when notification permission is denied", async () => {
      Object.defineProperty(global.Notification, "permission", {
        value: "denied",
        writable: true,
        configurable: true,
      })

      const result = await showCrossBrowserNotification("Test Title", { body: "Test body" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Notification permission not granted")
    })

    it("should return error when notifications are not supported", async () => {
      // Remove Notification from window
      delete (global as any).Notification

      const result = await showCrossBrowserNotification("Test Title", { body: "Test body" })

      expect(result.success).toBe(false)
      expect(result.method).toBe("unsupported")
      expect(result.error).toBe("Notifications not supported in this browser")
    })

    it("should handle Android Chrome 'Illegal constructor' error", async () => {
      const error = new Error("Failed to construct 'Notification': Illegal constructor")
      mockShowNotification.mockRejectedValue(error)

      const result = await showCrossBrowserNotification(
        "Test Title",
        { body: "Test body" },
        "test-context",
      )

      expect(result.success).toBe(false)
      expect(logger.log.warn).toHaveBeenCalledWith(
        { module: "utils", context: "test-context" },
        "Android Chrome detected - direct Notification constructor blocked. Service worker method should be used instead.",
      )
    })
  })

  describe("getNotificationCapabilities", () => {
    it("should return correct capabilities when notifications are supported", () => {
      const capabilities = getNotificationCapabilities()

      expect(capabilities.supported).toBe(true)
      expect(capabilities.permission).toBe("granted")
      expect(capabilities.preferredMethod).toBe("service-worker")
      expect(capabilities.requiresPermission).toBe(false)
    })

    it("should return unsupported when Notification is not available", () => {
      delete (global as any).Notification

      const capabilities = getNotificationCapabilities()

      expect(capabilities.supported).toBe(false)
      expect(capabilities.permission).toBe("unsupported")
      expect(capabilities.preferredMethod).toBe("unsupported")
    })
  })

  describe("requestNotificationPermission", () => {
    it("should request permission successfully", async () => {
      mockRequestPermission.mockResolvedValue("granted")

      const permission = await requestNotificationPermission("test-context")

      expect(permission).toBe("granted")
      expect(logger.log.info).toHaveBeenCalledWith(
        { module: "utils", context: "test-context", permission: "granted" },
        "Notification permission granted",
      )
    })

    it("should handle permission request errors", async () => {
      mockRequestPermission.mockRejectedValue(new Error("Permission error"))

      const permission = await requestNotificationPermission("test-context")

      expect(permission).toBe("denied")
      expect(logger.log.error).toHaveBeenCalled()
    })

    it("should return denied when notifications are not supported", async () => {
      delete (global as any).Notification

      const permission = await requestNotificationPermission()

      expect(permission).toBe("denied")
      expect(logger.log.error).toHaveBeenCalledWith(
        { module: "utils", context: "cross-browser-notifications" },
        "Notifications not supported in this browser",
      )
    })
  })
})
