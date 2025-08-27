import { ReactNode } from "react"
import { vi } from "vitest"

// Mock Next.js router
export const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
  pathname: "/",
  query: {},
  asPath: "/",
  route: "/",
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
}

// Mock router provider
export const MockRouter = ({
  children,
  router = mockRouter,
}: {
  children: ReactNode
  router?: typeof mockRouter
}) => {
  // Note: vi.mock needs to be at module level, not inside components
  // This component is for setting context, actual mocking should be done at test level
  return <>{children}</>
}

// Export router mock for direct use
export { mockRouter as router }
