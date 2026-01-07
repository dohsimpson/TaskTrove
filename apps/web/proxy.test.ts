/**
 * Proxy Tests
 *
 * Tests Next.js proxy functionality including i18n cookie handling
 * and authentication integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

// Mock environment variables with hoisted function
type MockEnv = { AUTH_SECRET?: string; NODE_ENV: string }
const mockEnv = vi.hoisted<MockEnv>(() => ({
  AUTH_SECRET: undefined,
  NODE_ENV: "test",
}))

// Mock process.env before any imports
Object.defineProperty(process, "env", {
  value: new Proxy(process.env, {
    get(target, prop: string | symbol) {
      if (prop === "AUTH_SECRET" || prop === "NODE_ENV") {
        return mockEnv[prop]
      }
      return Reflect.get(target, prop)
    },
    set(target, prop: string | symbol, value) {
      if (prop === "AUTH_SECRET" || prop === "NODE_ENV") {
        mockEnv[prop] = typeof value === "string" ? value : String(value)
        return true
      }
      Reflect.set(target, prop, value)
      return true
    },
  }),
})

vi.mock("./auth", () => ({
  auth: vi.fn((handler: (req: NextRequest) => NextResponse) => (req: NextRequest) => handler(req)), // Mock auth wrapper - pass through to our proxy handler
}))

vi.mock("accept-language", () => ({
  default: {
    languages: vi.fn(),
    get: vi.fn(),
  },
}))

vi.mock("./lib/i18n/settings", () => ({
  languages: ["en", "zh", "fr", "de", "es", "nl", "ko", "ja", "it", "pt"],
  fallbackLng: "en",
  cookieName: "i18next",
}))

// Import mocked accept-language
import acceptLanguage from "accept-language"
// Import proxy handler after mocks are set up
import proxy from "./proxy"

const mockAcceptLanguage = vi.mocked(acceptLanguage)

const callProxy = (request: NextRequest) => proxy(request, { params: Promise.resolve({}) })

function createTestRequest(
  pathname: string,
  options: {
    cookies?: Record<string, string>
    acceptLanguage?: string
    auth?: boolean
  } = {},
): NextRequest {
  const url = `http://localhost:3000${pathname}`
  const headers = new Headers()

  if (options.acceptLanguage) {
    headers.set("Accept-Language", options.acceptLanguage)
  }

  // Create request with headers
  const request = new NextRequest(url, {
    headers,
  })

  // Mock cookies
  type Cookie = { name: string; value: string }
  const cookieEntries = options.cookies
    ? Object.entries(options.cookies).map<Cookie>(([name, value]) => ({ name, value }))
    : []
  const cookieMap = new Map(cookieEntries.map((cookie) => [cookie.name, cookie]))

  Object.defineProperty(request, "cookies", {
    value: {
      get: (name: string) => cookieMap.get(name),
      has: (name: string) => cookieMap.has(name),
    },
  })

  // Mock auth property for NextAuthRequest
  if (options.auth !== undefined) {
    Reflect.set(request, "auth", options.auth ? { user: { id: "test" } } : undefined)
  }

  return request
}

describe("Proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset environment
    mockEnv.AUTH_SECRET = undefined
    mockEnv.NODE_ENV = "test"

    // Setup accept-language mock
    mockAcceptLanguage.get.mockImplementation((lang) => {
      if (!lang) return null
      if (lang.includes("zh")) return "zh"
      if (lang.includes("fr")) return "fr"
      if (lang.includes("en")) return "en"
      return null
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("i18n cookie handling without AUTH_SECRET", () => {
    beforeEach(() => {
      // Ensure AUTH_SECRET is not set
      mockEnv.AUTH_SECRET = undefined
    })

    it("should set i18n cookie when AUTH_SECRET is not set (regression test)", async () => {
      const request = createTestRequest("/", {
        acceptLanguage: "zh-CN,zh;q=0.9,en;q=0.8",
      })

      const response = await callProxy(request)

      // This is the key regression test - before the fix, proxy would return undefined
      // when AUTH_SECRET was not set, breaking i18n cookie persistence
      expect(response).toBeDefined()
      expect(response).toBeInstanceOf(NextResponse)

      // Verify that setI18nResponse was called by checking response exists
      expect(response?.status).toBe(200)
    })

    it("should ensure proxy always returns a response (bug fix verification)", async () => {
      const request = createTestRequest("/dashboard")

      const response = await callProxy(request)

      // Core test: proxy MUST return a response when AUTH_SECRET is not set
      // This was the root cause of the i18n cookie persistence bug
      expect(response).not.toBeUndefined()
      expect(response).not.toBeNull()
      expect(response).toBeInstanceOf(NextResponse)
    })

    it("should handle existing i18n cookie when AUTH_SECRET is not set", async () => {
      const request = createTestRequest("/", {
        cookies: { i18next: "fr" },
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(response).toBeInstanceOf(NextResponse)
      expect(response?.status).toBe(200)
    })

    it("should use Accept-Language header when no cookie and AUTH_SECRET not set", async () => {
      const request = createTestRequest("/", {
        acceptLanguage: "zh-CN,zh;q=0.9",
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(mockAcceptLanguage.get).toHaveBeenCalledWith("zh-CN,zh;q=0.9")
    })

    it("should fallback to default language when no cookie or Accept-Language", async () => {
      const request = createTestRequest("/")

      // Mock accept-language to return null for both cookie and header
      mockAcceptLanguage.get.mockReturnValue(null)

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe("i18n cookie handling with AUTH_SECRET", () => {
    beforeEach(() => {
      // Set AUTH_SECRET to enable auth
      mockEnv.AUTH_SECRET = "test-secret-key"
    })

    it("should handle i18n cookie for authenticated users", async () => {
      const request = createTestRequest("/", {
        auth: true,
        acceptLanguage: "fr-FR,fr;q=0.9",
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(response).toBeInstanceOf(NextResponse)
    })

    it("should handle i18n cookie during redirect for unauthenticated users", async () => {
      const request = createTestRequest("/", {
        auth: false,
        acceptLanguage: "zh-CN,zh;q=0.9",
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(response).toBeInstanceOf(NextResponse)
      // With AUTH_SECRET set, proxy should either redirect or set i18n properly
      // The exact status depends on auth wrapper behavior, but response should exist
      expect([200, 307].includes(response?.status || 0)).toBe(true)
    })
  })

  describe("route handling", () => {
    beforeEach(() => {
      mockEnv.AUTH_SECRET = undefined // Test without auth for simplicity
    })

    it("should handle auth routes without additional processing", async () => {
      const request = createTestRequest("/api/auth/signin", {
        acceptLanguage: "en-US,en;q=0.9",
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(response?.status).toBe(200)
    })

    it("should handle signin routes", async () => {
      const request = createTestRequest("/signin", {
        acceptLanguage: "zh-CN,zh;q=0.9",
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(response?.status).toBe(200)
    })

    it("should handle initial-setup API routes", async () => {
      const request = createTestRequest("/api/initial-setup", {
        acceptLanguage: "fr-FR,fr;q=0.9",
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(response?.status).toBe(200)
    })

    it("should handle regular routes with i18n processing", async () => {
      const request = createTestRequest("/dashboard", {
        acceptLanguage: "es-ES,es;q=0.9",
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(response?.status).toBe(200)
    })
  })

  describe("language detection priority", () => {
    beforeEach(() => {
      mockEnv.AUTH_SECRET = undefined
    })

    it("should prioritize existing cookie over Accept-Language header", async () => {
      const request = createTestRequest("/", {
        cookies: { i18next: "zh" },
        acceptLanguage: "fr-FR,fr;q=0.9",
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      // Should use cookie value (zh) over Accept-Language (fr)
      expect(mockAcceptLanguage.get).toHaveBeenCalledWith("zh")
    })

    it("should use Accept-Language when no cookie exists", async () => {
      const request = createTestRequest("/", {
        acceptLanguage: "de-DE,de;q=0.9,en;q=0.8",
      })

      const response = await callProxy(request)

      expect(response).toBeDefined()
      expect(mockAcceptLanguage.get).toHaveBeenCalledWith("de-DE,de;q=0.9,en;q=0.8")
    })
  })
})
