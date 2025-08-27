import { ReactNode, useEffect } from "react"
import { vi } from "vitest"

// Mock function type for better TypeScript compatibility
type MockFn<T extends (...args: any[]) => any> = T & {
  mockReturnValue: (value: ReturnType<T>) => MockFn<T>
  mockImplementation: (impl: T) => MockFn<T>
  mockClear: () => void
  mockReset: () => void
  mockRestore: () => void
}

// Enhanced mock navigation state interface
interface MockNavigationState {
  pathname: string
  searchParams: URLSearchParams
  router: {
    push: MockFn<(url: string, options?: { scroll?: boolean }) => void>
    replace: MockFn<(url: string, options?: { scroll?: boolean }) => void>
    back: MockFn<() => void>
    forward: MockFn<() => void>
    refresh: MockFn<() => void>
    prefetch: MockFn<(href: string, options?: { kind?: string }) => void>
    // Legacy router properties for backward compatibility
    pathname: string
    query: Record<string, string | string[] | undefined>
    asPath: string
    route: string
    events: {
      on: MockFn<(event: string, handler: () => void) => void>
      off: MockFn<(event: string, handler: () => void) => void>
      emit: MockFn<(event: string) => void>
    }
  }
}

// Global mock state - configurable for different test scenarios
let mockState: MockNavigationState = {
  pathname: "/",
  searchParams: new URLSearchParams(),
  router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    // Legacy properties
    pathname: "/",
    query: {},
    asPath: "/",
    route: "/",
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
  },
}

// Configuration utilities for test scenarios
export const mockNavigation = {
  /**
   * Set the current pathname for usePathname mock
   */
  setPathname: (pathname: string) => {
    mockState.pathname = pathname
    mockState.router.pathname = pathname
    mockState.router.asPath = pathname
    mockState.router.route = pathname
  },

  /**
   * Set search parameters for useSearchParams mock
   */
  setSearchParams: (params: URLSearchParams | string | Record<string, string>) => {
    if (typeof params === "string") {
      mockState.searchParams = new URLSearchParams(params)
    } else if (params instanceof URLSearchParams) {
      mockState.searchParams = params
    } else {
      mockState.searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        mockState.searchParams.set(key, value)
      })
    }
  },

  /**
   * Set router query parameters (legacy)
   */
  setQuery: (query: Record<string, string | string[] | undefined>) => {
    mockState.router.query = query
  },

  /**
   * Get current mock state for assertions
   */
  getPathname: () => mockState.pathname,
  getSearchParams: () => mockState.searchParams,
  getRouter: () => mockState.router,

  /**
   * Reset all mock state and clear mock function calls
   */
  reset: () => {
    mockState.pathname = "/"
    mockState.searchParams = new URLSearchParams()
    mockState.router.pathname = "/"
    mockState.router.query = {}
    mockState.router.asPath = "/"
    mockState.router.route = "/"
    vi.clearAllMocks()
  },

  /**
   * Configure multiple navigation properties at once
   */
  configure: (config: {
    pathname?: string
    searchParams?: URLSearchParams | string | Record<string, string>
    query?: Record<string, string | string[] | undefined>
  }) => {
    if (config.pathname !== undefined) {
      mockNavigation.setPathname(config.pathname)
    }
    if (config.searchParams !== undefined) {
      mockNavigation.setSearchParams(config.searchParams)
    }
    if (config.query !== undefined) {
      mockNavigation.setQuery(config.query)
    }
  },
}

// Hook implementations that use configurable state
export const mockUseRouter = () => mockState.router
export const mockUsePathname = () => mockState.pathname
export const mockUseSearchParams = () => mockState.searchParams

/**
 * Centralized Next.js navigation mocking setup
 * Call this in your test files to mock all navigation hooks at once
 *
 * @example
 * ```tsx
 * import { mockNextNavigation, mockNavigation } from '@/test-utils/mock-router'
 *
 * // In your test file
 * mockNextNavigation()
 *
 * // Configure for specific test
 * beforeEach(() => {
 *   mockNavigation.configure({ pathname: '/test' })
 * })
 * ```
 */
export const mockNextNavigation = () => {
  vi.mock("next/navigation", () => ({
    useRouter: mockUseRouter,
    usePathname: mockUsePathname,
    useSearchParams: mockUseSearchParams,
  }))
}

// Backward compatibility exports
export const mockRouter = mockState.router
export { mockRouter as router }

/**
 * Enhanced MockRouter provider component with configuration support
 */
export const MockRouter = ({
  children,
  pathname = "/",
  searchParams,
  query = {},
}: {
  children: ReactNode
  pathname?: string
  searchParams?: URLSearchParams | string | Record<string, string>
  query?: Record<string, string | string[] | undefined>
}) => {
  // Configure mock state when component mounts or props change
  useEffect(() => {
    mockNavigation.configure({
      pathname,
      searchParams,
      query,
    })
  }, [pathname, searchParams, query])

  return <>{children}</>
}

/**
 * Utility function to create a pre-configured mock navigation setup
 * Useful for test suites that need consistent navigation state
 */
export const createMockNavigationConfig = (config: {
  pathname?: string
  searchParams?: URLSearchParams | string | Record<string, string>
  query?: Record<string, string | string[] | undefined>
}) => {
  return () => {
    mockNavigation.configure(config)
  }
}
