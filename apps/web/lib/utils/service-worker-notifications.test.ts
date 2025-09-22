/**
 * @vitest-environment jsdom
 */

/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  showServiceWorkerNotification,
  isSecureContext,
  getServiceWorker,
} from "./service-worker-notifications"
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

describe("service-worker-notifications", () => {
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

    // Mock secure context (HTTPS)
    Object.defineProperty(global.window, "location", {
      value: { protocol: "https:", hostname: "example.com" },
      writable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()

    // Restore serviceWorker if it was modified
    if (!Object.getOwnPropertyDescriptor(global.navigator, "serviceWorker")?.value) {
      Object.defineProperty(global.navigator, "serviceWorker", {
        value: mockServiceWorker,
        writable: true,
        configurable: true,
      })
    }
  })

  describe("showServiceWorkerNotification", () => {
    it("should show notification via service worker in secure context", async () => {
      mockShowNotification.mockResolvedValue(undefined)

      const result = await showServiceWorkerNotification(
        "Test Title",
        { body: "Test body" },
        "test-context",
      )

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
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

      const result = await showServiceWorkerNotification(
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

      const result = await showServiceWorkerNotification("Test Title", { body: "Test body" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Notification permission not granted")
    })

    it("should return error when notifications are not supported", async () => {
      // Remove Notification from window
      delete (global as any).Notification

      const result = await showServiceWorkerNotification("Test Title", { body: "Test body" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Notifications not supported in this browser")
    })

    it("should return error when not in secure context", async () => {
      // Mock insecure context (HTTP)
      Object.defineProperty(global.window, "location", {
        value: { protocol: "http:", hostname: "example.com" },
        writable: true,
      })

      const result = await showServiceWorkerNotification("Test Title", { body: "Test body" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Notifications require HTTPS or localhost")
    })

    it("should return error when service worker is not supported", async () => {
      // Create a mock navigator without serviceWorker support
      const originalNavigator = global.navigator
      const navigatorMock = {
        ...originalNavigator,
        serviceWorker: undefined,
      }
      Object.defineProperty(global, "navigator", {
        value: navigatorMock,
        configurable: true,
      })

      const result = await showServiceWorkerNotification("Test Title", { body: "Test body" })

      expect(result.success).toBe(false)
      expect(result.error).toBe("Service Worker not supported")

      // Restore original navigator
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        configurable: true,
      })
    })
  })

  describe("isSecureContext", () => {
    it("should return true for HTTPS", () => {
      Object.defineProperty(global.window, "location", {
        value: { protocol: "https:", hostname: "example.com" },
        writable: true,
      })

      expect(isSecureContext()).toBe(true)
    })

    it("should return true for localhost", () => {
      Object.defineProperty(global.window, "location", {
        value: { protocol: "http:", hostname: "localhost" },
        writable: true,
      })

      expect(isSecureContext()).toBe(true)
    })

    it("should return true for 127.0.0.1", () => {
      Object.defineProperty(global.window, "location", {
        value: { protocol: "http:", hostname: "127.0.0.1" },
        writable: true,
      })

      expect(isSecureContext()).toBe(true)
    })

    it("should return false for HTTP on non-localhost", () => {
      Object.defineProperty(global.window, "location", {
        value: { protocol: "http:", hostname: "example.com" },
        writable: true,
      })

      expect(isSecureContext()).toBe(false)
    })

    it("should return false when window is undefined", () => {
      const originalWindow = global.window
      delete (global as any).window

      expect(isSecureContext()).toBe(false)

      // Restore window
      global.window = originalWindow
    })
  })

  describe("getServiceWorker", () => {
    it("should return navigator.serviceWorker when supported", () => {
      const sw = getServiceWorker()
      expect(sw).toBe(navigator.serviceWorker)
    })

    it("should return null when service worker is not supported", () => {
      const originalNavigator = global.navigator
      const navigatorMock = {} as Navigator // Empty navigator without serviceWorker
      Object.defineProperty(global, "navigator", {
        value: navigatorMock,
        configurable: true,
      })

      const sw = getServiceWorker()
      expect(sw).toBeNull()

      // Restore original navigator
      Object.defineProperty(global, "navigator", {
        value: originalNavigator,
        configurable: true,
      })
    })
  })
})
