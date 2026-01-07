/**
 * API Test Setup
 *
 * This file contains mocks specific to API route tests.
 * These mocks only affect tests that import the mocked modules.
 */

import { vi } from "vitest"

const hasMutableHeaders = (response: unknown): response is { headers: Headers } => {
  return (
    typeof response === "object" &&
    response !== null &&
    "headers" in response &&
    response.headers instanceof Headers
  )
}

// Mock API middleware globally for API tests
// These mocks only take effect for files that import these modules

// Bypass authentication checks in tests
vi.mock("@/lib/middleware/auth", () => ({
  withAuthentication: (handler: (...args: unknown[]) => unknown) => handler,
}))

// Bypass API version checks in tests
vi.mock("@/lib/middleware/api-version", () => ({
  withApiVersion: (handler: (...args: unknown[]) => unknown) => handler,
  withDeprecationWarning: (handler: (...args: unknown[]) => unknown) => handler,
  CURRENT_API_VERSION: "1",
  SUPPORTED_API_VERSIONS: ["1"],
}))

// Bypass mutex protection in tests for simplicity
vi.mock("@/lib/utils/api-mutex", () => ({
  withMutexProtection: (handler: (...args: unknown[]) => unknown) => handler,
}))

// Mock API logging middleware - bypass logging in tests but preserve header behavior
vi.mock("@/lib/middleware/api-logger", () => ({
  withApiLogging: (handler: (...args: unknown[]) => unknown) => {
    return async (...args: unknown[]) => {
      const response = await handler(...args)
      // Add X-Request-ID header to match middleware behavior
      if (hasMutableHeaders(response) && !response.headers.get("X-Request-ID")) {
        response.headers.set("X-Request-ID", "test-request-id")
      }
      return response
    }
  },
  logBusinessEvent: vi.fn(),
  withFileOperationLogging: async (operation: () => Promise<unknown>) => operation(),
  withPerformanceLogging: async (operation: () => Promise<unknown>) => operation(),
  logSecurityEvent: vi.fn(),
}))
