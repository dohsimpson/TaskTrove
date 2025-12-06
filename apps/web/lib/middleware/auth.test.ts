/**
 * Authentication Middleware Tests
 *
 * Tests the withAuthentication middleware that protects API routes
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { withAuthentication } from "./auth"
import { NextResponse } from "next/server"
import type { ErrorResponse } from "@tasktrove/types/api-responses"
import { ApiErrorCode } from "@tasktrove/types/api-errors"
import { createGroupId } from "@tasktrove/types/id"
import { createUserId } from "@tasktrove/types/id"
import { DEFAULT_UUID } from "@tasktrove/constants"
import { DEFAULT_DATA_VERSION } from "@tasktrove/types/defaults"
import type { EnhancedRequest } from "./api-logger"
import { createMockEnhancedRequest } from "@/lib/utils/test-helpers"
import type { Session } from "next-auth"
import { safeReadDataFile } from "@/lib/utils/safe-file-operations"

// Unmock the auth middleware to test the real implementation
// (api-test-setup.ts mocks it globally, but we need the real one here)
vi.unmock("@/lib/middleware/auth")

// Mock NextAuth - auth() returns Promise<Session | null>
vi.mock("@/auth", () => ({
  auth: vi.fn().mockResolvedValue(null),
}))

// Mock safe-file-operations for bearer token tests
vi.mock("@/lib/utils/safe-file-operations", () => ({
  safeReadDataFile: vi.fn(),
}))

import { auth } from "@/auth"
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
const mockAuth = auth as ReturnType<typeof vi.fn>
const mockSafeReadDataFile = vi.mocked(safeReadDataFile)

describe("withAuthentication", () => {
  const mockHandler = vi.fn()
  let mockRequest: EnhancedRequest
  let originalAuthSecret: string | undefined

  beforeEach(() => {
    vi.clearAllMocks()
    // Save and set AUTH_SECRET for regular tests (authentication enabled)
    originalAuthSecret = process.env.AUTH_SECRET
    process.env.AUTH_SECRET = "test-secret"
    mockRequest = createMockEnhancedRequest(
      new Request("http://localhost:3000/api/tasks", {
        method: "GET",
      }),
    )
    mockHandler.mockResolvedValue(NextResponse.json({ success: true }))
  })

  afterEach(() => {
    // Restore original AUTH_SECRET after each test
    if (originalAuthSecret !== undefined) {
      process.env.AUTH_SECRET = originalAuthSecret
    } else {
      delete process.env.AUTH_SECRET
    }
  })

  describe("Authenticated Requests", () => {
    it("should allow access when session exists with valid user", async () => {
      // Mock valid session
      const mockSession: Session = {
        user: {
          name: "Test User",
          id: "test-user-id",
        },
        expires: new Date(Date.now() + 86400000).toISOString(), // expires in 24 hours
      }
      mockAuth.mockResolvedValue(mockSession)

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequest)

      // Handler should be called
      expect(mockHandler).toHaveBeenCalledWith(mockRequest)
      expect(mockHandler).toHaveBeenCalledTimes(1)

      // Response should be the one from handler
      const data = await response.json()
      expect(data).toEqual({ success: true })
    })

    it("should pass request correctly to handler when authenticated", async () => {
      const mockSession: Session = {
        user: {
          name: "Test User",
          id: "test-user-id",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      mockAuth.mockResolvedValue(mockSession)

      const wrappedHandler = withAuthentication(mockHandler)
      await wrappedHandler(mockRequest)

      // Verify handler received the original request
      expect(mockHandler).toHaveBeenCalledWith(mockRequest)
    })
  })

  describe("Unauthenticated Requests", () => {
    it("should return 401 when session is null", async () => {
      mockAuth.mockResolvedValue(null)

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequest)

      // Handler should NOT be called
      expect(mockHandler).not.toHaveBeenCalled()

      // Should return 401 error
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toMatchObject({
        code: ApiErrorCode.AUTHENTICATION_REQUIRED,
        error: "Authentication required",
        message: "You must be authenticated to access this resource",
      })
    })

    it("should return 401 when session exists but has no user", async () => {
      const mockSession: Session = {
        user: undefined,
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      mockAuth.mockResolvedValue(mockSession)

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequest)

      // Handler should NOT be called
      expect(mockHandler).not.toHaveBeenCalled()

      // Should return 401 error
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toMatchObject({
        code: ApiErrorCode.AUTHENTICATION_REQUIRED,
      })
    })

    it("should return 401 when session.user is null", async () => {
      const mockSession: Session = {
        user: undefined,
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      mockAuth.mockResolvedValue(mockSession)

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequest)

      // Handler should NOT be called
      expect(mockHandler).not.toHaveBeenCalled()

      // Should return 401 error
      expect(response.status).toBe(401)

      const data = await response.json()
      expect(data).toMatchObject({
        code: ApiErrorCode.AUTHENTICATION_REQUIRED,
      })
    })
  })

  describe("Error Response Format", () => {
    it("should return correctly formatted error response", async () => {
      mockAuth.mockResolvedValue(null)

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequest)

      // Check response structure
      const data = await response.json()
      expect(data).toHaveProperty("code")
      expect(data).toHaveProperty("error")
      expect(data).toHaveProperty("message")

      // Check correct values
      expect(data).toMatchObject({
        code: ApiErrorCode.AUTHENTICATION_REQUIRED,
      })
      expect(typeof data.error).toBe("string")
      expect(typeof data.message).toBe("string")
      expect(data.error && typeof data.error === "string" && data.error.length).toBeGreaterThan(0)
      expect(
        data.message && typeof data.message === "string" && data.message.length,
      ).toBeGreaterThan(0)
    })

    it("should set correct HTTP status code", async () => {
      mockAuth.mockResolvedValue(null)

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequest)

      expect(response.status).toBe(401)
    })

    it("should include appropriate error message for users", async () => {
      mockAuth.mockResolvedValue(null)

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequest)

      const data = await response.json()
      expect(data).toMatchObject({
        code: ApiErrorCode.AUTHENTICATION_REQUIRED,
      })
      expect(
        data && typeof data === "object" && "message" in data && typeof data.message === "string"
          ? data.message
          : "",
      ).toContain("authenticated")
      expect(
        data && typeof data === "object" && "message" in data && typeof data.message === "string"
          ? data.message.toLowerCase()
          : "",
      ).toContain("access")
    })
  })

  describe("Middleware Composition", () => {
    it("should work with other middleware in composition chain", async () => {
      const mockSession: Session = {
        user: {
          name: "Test User",
          id: "test-user-id",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      mockAuth.mockResolvedValue(mockSession)

      // Simulate composition with logging middleware
      const loggingMiddleware = (handler: typeof mockHandler) => {
        return async (request: EnhancedRequest) => {
          // Simulate logging
          return handler(request)
        }
      }

      const composedHandler = withAuthentication(loggingMiddleware(mockHandler))
      await composedHandler(mockRequest)

      expect(mockHandler).toHaveBeenCalledWith(mockRequest)
    })

    it("should stop middleware chain when authentication fails", async () => {
      mockAuth.mockResolvedValue(null)

      // Create a middleware that should not be reached
      const unreachableMiddleware = vi.fn()

      const composedHandler = withAuthentication(unreachableMiddleware)
      const response = await composedHandler(mockRequest)

      // The unreachable middleware should never be called
      expect(unreachableMiddleware).not.toHaveBeenCalled()

      // Should return 401
      expect(response.status).toBe(401)
    })
  })

  describe("Edge Cases", () => {
    it("should handle auth() throwing an error", async () => {
      mockAuth.mockRejectedValue(new Error("Auth system failure"))

      const wrappedHandler = withAuthentication(mockHandler)

      // Should propagate the error
      await expect(wrappedHandler(mockRequest)).rejects.toThrow("Auth system failure")
    })

    it("should preserve handler response when authenticated", async () => {
      const mockSession: Session = {
        user: {
          name: "Test User",
          id: "test-user-id",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      mockAuth.mockResolvedValue(mockSession)

      const customResponse = NextResponse.json({ custom: "data", count: 42 })
      mockHandler.mockResolvedValue(customResponse)

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequest)

      const data = await response.json()
      expect(data).toEqual({ custom: "data", count: 42 })
    })

    it("should handle handler errors when authenticated", async () => {
      const mockSession: Session = {
        user: {
          name: "Test User",
          id: "test-user-id",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      mockAuth.mockResolvedValue(mockSession)

      const handlerError = new Error("Handler error")
      mockHandler.mockRejectedValue(handlerError)

      const wrappedHandler = withAuthentication(mockHandler)

      // Should propagate handler errors
      await expect(wrappedHandler(mockRequest)).rejects.toThrow("Handler error")
    })
  })

  describe("Type Safety", () => {
    it("should accept generic response types", async () => {
      const mockSession: Session = {
        user: {
          name: "Test User",
          id: "test-user-id",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      mockAuth.mockResolvedValue(mockSession)

      interface CustomResponse {
        data: string
        count: number
      }

      const typedHandler = async (
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _request: EnhancedRequest,
      ): Promise<NextResponse<CustomResponse | ErrorResponse>> => {
        return NextResponse.json<CustomResponse>({ data: "test", count: 1 })
      }

      const wrappedHandler = withAuthentication(typedHandler)
      const response = await wrappedHandler(mockRequest)

      const data = await response.json()
      expect(data).toEqual({ data: "test", count: 1 })
    })
  })

  describe("Auth Disabled (No AUTH_SECRET)", () => {
    let originalAuthSecret: string | undefined

    beforeEach(() => {
      // Save and clear AUTH_SECRET to simulate auth being disabled
      originalAuthSecret = process.env.AUTH_SECRET
      delete process.env.AUTH_SECRET
    })

    afterEach(() => {
      // Restore original AUTH_SECRET
      if (originalAuthSecret !== undefined) {
        process.env.AUTH_SECRET = originalAuthSecret
      } else {
        delete process.env.AUTH_SECRET
      }
    })

    it("should bypass authentication when AUTH_SECRET is not set", async () => {
      // Verify AUTH_SECRET is cleared
      expect(process.env.AUTH_SECRET).toBeUndefined()

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequest)

      // Handler should be called without checking auth
      expect(mockHandler).toHaveBeenCalledWith(mockRequest)
      expect(mockHandler).toHaveBeenCalledTimes(1)

      // Response should be the one from handler (not 401)
      const data = await response.json()
      expect(data).toEqual({ success: true })
      expect(response.status).toBe(200)
    })

    it("should not call auth() when AUTH_SECRET is not set", async () => {
      // Verify AUTH_SECRET is cleared
      expect(process.env.AUTH_SECRET).toBeUndefined()

      const wrappedHandler = withAuthentication(mockHandler)
      await wrappedHandler(mockRequest)

      // auth() should never be called when AUTH_SECRET is not set
      expect(mockAuth).not.toHaveBeenCalled()

      // Handler should be called directly
      expect(mockHandler).toHaveBeenCalledWith(mockRequest)
    })

    it("should work in development mode without AUTH_SECRET", async () => {
      // Simulate development environment without auth
      delete process.env.AUTH_SECRET

      // Create a handler that returns custom data
      const devHandler = vi.fn().mockResolvedValue(NextResponse.json({ dev: true, data: "test" }))

      const wrappedHandler = withAuthentication(devHandler)
      const response = await wrappedHandler(mockRequest)

      // Should bypass auth and call handler directly
      expect(devHandler).toHaveBeenCalled()
      expect(mockAuth).not.toHaveBeenCalled()

      const data = await response.json()
      expect(data).toEqual({ dev: true, data: "test" })
    })
  })

  describe("Bearer Token Authentication", () => {
    let mockRequestWithHeaders: EnhancedRequest

    beforeEach(() => {
      // Reset AUTH_SECRET for these tests
      process.env.AUTH_SECRET = "test-secret"
      // Create mock request with headers
      mockRequestWithHeaders = createMockEnhancedRequest(
        new Request("http://localhost:3000/api/tasks", {
          method: "GET",
          headers: new Headers(),
        }),
      )
    })

    it("should allow access with valid bearer token when allowApiToken is true", async () => {
      const validToken = "test-valid-token-123"
      mockRequestWithHeaders.headers.set("authorization", `Bearer ${validToken}`)

      // Mock safeReadDataFile to return data file with matching API token
      mockSafeReadDataFile.mockResolvedValue({
        version: DEFAULT_DATA_VERSION,
        user: {
          id: createUserId(DEFAULT_UUID),
          username: "admin",
          password: "hashed-password",
          apiToken: validToken,
        },
        settings: {
          general: {
            startView: "all",
            soundEnabled: true,
            linkifyEnabled: true,
            markdownEnabled: true,
            popoverHoverOpen: false,
          },
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "00:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: false,
          },
          uiSettings: {
            weekStartsOn: undefined,
          },
        },
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: createGroupId("12345678-1234-4234-8234-123456789abc"),
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: createGroupId("12345678-1234-4234-8234-123456789abc"),
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
      })

      const wrappedHandler = withAuthentication(mockHandler, { allowApiToken: true })
      const response = await wrappedHandler(mockRequestWithHeaders)

      // Handler should be called (token is valid)
      expect(mockHandler).toHaveBeenCalledWith(mockRequestWithHeaders)
      expect(mockHandler).toHaveBeenCalledTimes(1)

      // auth() should NOT be called - bearer token authentication succeeded
      expect(mockAuth).not.toHaveBeenCalled()

      // Response should be the one from handler
      const data = await response.json()
      expect(data).toEqual({ success: true })
    })

    it("should reject invalid bearer token when allowApiToken is true", async () => {
      const invalidToken = "test-invalid-token"
      mockRequestWithHeaders.headers.set("authorization", `Bearer ${invalidToken}`)

      // Mock safeReadDataFile to return data file with different API token
      mockSafeReadDataFile.mockResolvedValue({
        version: DEFAULT_DATA_VERSION,
        user: {
          id: createUserId(DEFAULT_UUID),
          username: "admin",
          password: "hashed-password",
          apiToken: "different-token-456",
        },
        settings: {
          general: {
            startView: "all",
            soundEnabled: true,
            linkifyEnabled: true,
            markdownEnabled: true,
            popoverHoverOpen: false,
          },
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "00:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: false,
          },
          uiSettings: {
            weekStartsOn: undefined,
          },
        },
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: createGroupId("12345678-1234-4234-8234-123456789abc"),
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: createGroupId("12345678-1234-4234-8234-123456789abc"),
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
      })

      // Mock no valid session
      mockAuth.mockResolvedValue(null)

      const wrappedHandler = withAuthentication(mockHandler, { allowApiToken: true })
      const response = await wrappedHandler(mockRequestWithHeaders)

      // Handler should NOT be called
      expect(mockHandler).not.toHaveBeenCalled()

      // Should return 401
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toMatchObject({
        code: ApiErrorCode.AUTHENTICATION_REQUIRED,
      })
    })

    it("should reject when no API token is configured and allowApiToken is true", async () => {
      const token = "some-token"
      mockRequestWithHeaders.headers.set("authorization", `Bearer ${token}`)

      // Mock safeReadDataFile to return data file without API token
      mockSafeReadDataFile.mockResolvedValue({
        version: DEFAULT_DATA_VERSION,
        user: {
          id: createUserId(DEFAULT_UUID),
          username: "admin",
          password: "hashed-password",
          // No apiToken field
        },
        settings: {
          general: {
            startView: "all",
            soundEnabled: true,
            linkifyEnabled: true,
            markdownEnabled: true,
            popoverHoverOpen: false,
          },
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "00:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: false,
          },
          uiSettings: {
            weekStartsOn: undefined,
          },
        },
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: createGroupId("12345678-1234-4234-8234-123456789abc"),
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: createGroupId("12345678-1234-4234-8234-123456789abc"),
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
      })

      // Mock no valid session
      mockAuth.mockResolvedValue(null)

      const wrappedHandler = withAuthentication(mockHandler, { allowApiToken: true })
      const response = await wrappedHandler(mockRequestWithHeaders)

      // Handler should NOT be called
      expect(mockHandler).not.toHaveBeenCalled()

      // Should return 401
      expect(response.status).toBe(401)
    })

    it("should fall back to session auth when no bearer token provided", async () => {
      // No authorization header set
      const mockSession: Session = {
        user: {
          name: "Test User",
          id: "test-user-id",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      mockAuth.mockResolvedValue(mockSession)

      const wrappedHandler = withAuthentication(mockHandler)
      const response = await wrappedHandler(mockRequestWithHeaders)

      // Should fall back to session auth
      expect(mockAuth).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalledWith(mockRequestWithHeaders)

      const data = await response.json()
      expect(data).toEqual({ success: true })
    })

    it("should handle safeReadDataFile errors gracefully when allowApiToken is true", async () => {
      const token = "some-token"
      mockRequestWithHeaders.headers.set("authorization", `Bearer ${token}`)

      // Mock safeReadDataFile to throw error
      mockSafeReadDataFile.mockRejectedValue(new Error("File read error"))

      // Mock no valid session
      mockAuth.mockResolvedValue(null)

      const wrappedHandler = withAuthentication(mockHandler, { allowApiToken: true })
      const response = await wrappedHandler(mockRequestWithHeaders)

      // Should fall back to returning 401
      expect(response.status).toBe(401)
      expect(mockHandler).not.toHaveBeenCalled()
    })

    it("should ignore bearer token when allowApiToken is false", async () => {
      const validToken = "test-valid-token-123"
      mockRequestWithHeaders.headers.set("authorization", `Bearer ${validToken}`)

      // Mock safeReadDataFile to return data file with matching API token
      mockSafeReadDataFile.mockResolvedValue({
        version: DEFAULT_DATA_VERSION,
        user: {
          id: createUserId(DEFAULT_UUID),
          username: "admin",
          password: "hashed-password",
          apiToken: validToken,
        },
        settings: {
          general: {
            startView: "all",
            soundEnabled: true,
            linkifyEnabled: true,
            markdownEnabled: true,
            popoverHoverOpen: false,
          },
          data: {
            autoBackup: {
              enabled: false,
              backupTime: "00:00",
              maxBackups: 10,
            },
          },
          notifications: {
            enabled: true,
            requireInteraction: false,
          },
          uiSettings: {
            weekStartsOn: undefined,
          },
        },
        tasks: [],
        projects: [],
        labels: [],
        projectGroups: {
          type: "project",
          id: createGroupId("12345678-1234-4234-8234-123456789abc"),
          name: "All Projects",
          slug: "all-projects",
          items: [],
        },
        labelGroups: {
          type: "label",
          id: createGroupId("12345678-1234-4234-8234-123456789abc"),
          name: "All Labels",
          slug: "all-labels",
          items: [],
        },
      })

      // Mock valid session for fallback
      const mockSession: Session = {
        user: {
          name: "Test User",
          id: "test-user-id",
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      }
      mockAuth.mockResolvedValue(mockSession)

      const wrappedHandler = withAuthentication(mockHandler, { allowApiToken: false })
      const response = await wrappedHandler(mockRequestWithHeaders)

      // Should NOT check bearer token, should use session auth instead
      expect(mockSafeReadDataFile).not.toHaveBeenCalled()
      expect(mockAuth).toHaveBeenCalled()
      expect(mockHandler).toHaveBeenCalledWith(mockRequestWithHeaders)

      const data = await response.json()
      expect(data).toEqual({ success: true })
    })
  })
})
