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

  // Create a mock that includes all required NextRequest properties
  // For testing purposes, we create a partial implementation
  const mockEnhancedRequest: Partial<EnhancedRequest> = {
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
    [Symbol.for("internal")]: {}, // Mock internal NextRequest symbol
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions
    cookies: {
      get: () => undefined,
      getAll: () => [],
      has: () => false,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
      set: () => ({}) as any, // Mock return for RequestCookies
      delete: () => true, // Mock return for boolean
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
      clear: () => ({}) as any, // Mock return for RequestCookies
      toString: () => "",
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    } as any,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    nextUrl: {
      pathname: request.url ? new URL(request.url).pathname : "/api/test",
      searchParams: new URLSearchParams(),
      href: request.url || "http://localhost:3000/api/test",
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    } as any,
    page: undefined,
    ua: undefined,

    // Add our context
    context,
  }

  // ESLint disable: Type assertion needed for test mock to satisfy interface
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
  if (call.length > 0) {
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
  if (result.type === "return") {
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
