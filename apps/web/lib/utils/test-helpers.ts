/**
 * Type-safe test utilities to replace type assertions in tests
 */

import { vi } from "vitest"
import type { EnhancedRequest, RequestContext } from "@/lib/middleware/api-logger"

/**
 * Create a mock atom value for Jotai testing
 */
export function createMockAtomValue<T>(value: T): {
  init: T
  read: () => T
  write: () => void
  toString: () => string
} {
  return {
    init: value,
    read: () => value,
    write: () => {},
    toString: () => `atom(${JSON.stringify(value)})`,
  }
}

// Define minimal mock interfaces for testing
interface MockRequestCookies {
  get: (name: string) => string | undefined
  getAll: () => Array<{ name: string; value: string }>
  has: (name: string) => boolean
  set: (name: string, value: string) => MockRequestCookies
  delete: (name: string) => boolean
  clear: () => MockRequestCookies
  toString: () => string
}

interface MockNextUrl {
  pathname: string
  searchParams: URLSearchParams
  href: string
  origin: string
  protocol: string
  host: string
  hostname: string
  port: string
  search: string
  hash: string
  toJSON: () => string
}

/**
 * Create a mock EnhancedRequest for API testing
 * Creates a mock that satisfies the EnhancedRequest interface for testing purposes.
 * Note: This is a test utility that provides minimal viable mocking.
 */
export function createMockEnhancedRequest(request: Request): EnhancedRequest {
  const context: RequestContext = {
    requestId: "test-request",
    startTime: Date.now(),
    method: request.method || "GET",
    endpoint: "/api/test",
  }

  // Create mock cookies object
  const mockCookies: MockRequestCookies = {
    get: () => undefined,
    getAll: () => [],
    has: () => false,
    set: () => mockCookies,
    delete: () => true,
    clear: () => mockCookies,
    toString: () => "",
  }

  // Create mock nextUrl object
  const url = request.url ? new URL(request.url) : new URL("http://localhost:3000/api/test")
  const mockNextUrl: MockNextUrl = {
    pathname: url.pathname,
    searchParams: url.searchParams,
    href: url.href,
    origin: url.origin,
    protocol: url.protocol,
    host: url.host,
    hostname: url.hostname,
    port: url.port,
    search: url.search,
    hash: url.hash,
    toJSON: () => url.href,
  }

  // Create a mock that includes all required NextRequest properties
  // For testing purposes, we create a partial implementation
  const mockEnhancedRequest = {
    // Copy all Request properties and ensure essential methods work
    method: request.method,
    url: request.url,
    headers: request.headers,
    body: request.body,
    bodyUsed: request.bodyUsed,
    cache: request.cache,
    credentials: request.credentials,
    destination: request.destination,
    integrity: request.integrity,
    mode: request.mode,
    redirect: request.redirect,
    referrer: request.referrer,
    referrerPolicy: request.referrerPolicy,
    signal: request.signal,

    // Ensure critical methods are available
    clone: () => request.clone(),
    json: () => request.json(),
    text: () => request.text(),
    arrayBuffer: () => request.arrayBuffer(),
    blob: () => request.blob(),
    formData: () => request.formData(),

    // Required NextRequest-specific properties (minimal viable mocks)
    cookies: mockCookies,
    nextUrl: mockNextUrl,
    page: undefined,
    ua: undefined,

    // Add our context
    context,
  }

  // Type assertion is necessary for test mocks to satisfy the interface
  // This is a legitimate use case for testing utilities
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return mockEnhancedRequest as EnhancedRequest
}

/**
 * Create a mock Jotai useAtomValue hook
 */
export function createMockUseAtomValue<T>(value: T) {
  return vi.fn().mockReturnValue(value)
}

/**
 * Create a mock Jotai useSetAtom hook
 */
export function createMockUseSetAtom() {
  return vi.fn().mockReturnValue(vi.fn())
}

/**
 * Type-safe mock function creation
 */
export function createMockFunction(): ReturnType<typeof vi.fn> {
  return vi.fn()
}

/**
 * Validate mock call arguments safely
 * Returns the arguments from a specific mock call
 */
export function getMockCallArgs(
  mock: ReturnType<typeof vi.fn>,
  callIndex: number = 0,
): unknown[] | null {
  const call = mock.mock.calls[callIndex]
  if (call && call.length > 0) {
    // Return the raw call arguments - no type assertion needed
    // Callers can handle type checking themselves
    return call
  }
  return null
}

/**
 * Safely get the return value from a mock call
 */
export function getMockCallResult<T>(
  mock: ReturnType<typeof vi.fn>,
  callIndex: number = 0,
): T | null {
  const result = mock.mock.results[callIndex]
  if (result && result.type === "return") {
    // Type-safe return - assume caller knows the expected type T
    return result.value
  }
  return null
}

/**
 * Create a mock Response object without type assertions
 * Uses the Response constructor to create a properly typed Response
 * @param options Response configuration
 * @returns Properly typed Response object
 */
export function createMockResponse(options: {
  ok: boolean
  status?: number
  statusText?: string
  json?: () => Promise<unknown>
}): Response {
  const status = options.status ?? (options.ok ? 200 : 500)
  const statusText = options.statusText ?? (options.ok ? "OK" : "Internal Server Error")

  // Create a real Response object using the constructor
  const response = new Response(null, {
    status,
    statusText,
    headers: new Headers(),
  })

  // If we need to mock the json method, we'll override it on the instance
  if (options.json) {
    Object.defineProperty(response, "json", {
      value: options.json,
      writable: false,
    })
  }

  return response
}
