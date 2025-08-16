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
  // Mock useRouter hook
  vi.mock("next/navigation", () => ({
    useRouter: () => router,
    usePathname: () => router.pathname,
    useSearchParams: () => new URLSearchParams(),
  }))

  return <>{children}</>
}

// Export router mock for direct use
export { mockRouter as router }
