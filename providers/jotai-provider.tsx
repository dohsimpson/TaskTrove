"use client"

import * as React from "react"
import { ReactNode, Suspense, Component, ComponentType, useEffect, useState } from "react"
import { Provider as JotaiProvider } from "jotai"
import { useHydrateAtoms } from "jotai/react/utils"
import dynamic from "next/dynamic"
import type { DevToolsProps } from "jotai-devtools"
import { useTheme } from "next-themes"
import { DevTools } from "./DevTools"
import { log } from "@/lib/utils/logger"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { queryClientAtom } from "jotai-tanstack-query"

export const queryClient = new QueryClient()

interface JotaiProviderWrapperProps {
  children: ReactNode
  /**
   * Optional custom error fallback component
   */
  errorFallback?: ReactNode
  /**
   * **For Server-Side Rendering (SSR) with Next.js**
   *
   * This prop allows you to pass server-fetched state to the Jotai provider
   * on the client. This is crucial for proper hydration, preventing issues
   * where the client-side state doesn't match the server-rendered UI.
   *
   * @example
   * // In your server component (e.g., Next.js Page)
   * const preloadedState = await getPreloadedState(); // Fetch initial data
   * <JotaiProvider initialState={preloadedState}>
   *   <YourApp />
   * </JotaiProvider>
   */
  initialState?: Iterable<[any, any]>
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

/**
 * Error boundary specifically for Jotai atom errors
 * Prevents atom state errors from crashing the entire app
 */
class JotaiErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging with context
    log.error(
      {
        module: "providers",
        error: error.message,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      },
      "Jotai Error Boundary caught an error",
    )

    // In development, also log to help with debugging
    if (process.env.NODE_ENV === "development") {
      log.debug(
        {
          module: "providers",
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        },
        "🔴 Jotai State Error Details (Development)",
      )
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback or default fallback UI
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <div className="text-center max-w-md">
              <div className="mb-4 text-6xl">⚠️</div>
              <h2 className="text-xl font-semibold text-destructive mb-2">
                Unexpected Application Error
              </h2>
              <p className="text-muted-foreground mb-4">
                An unexpected crash occurred in TaskTrove. This is likely a bug. Please try
                refreshing the page first. If that fails, try going to the home page to see if the
                app loads there. If the problem persists, please check our GitHub issues to see if
                it's already reported, or create a new issue if needed.
              </p>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mb-4 text-sm text-left">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.error.message}
                    {this.state.error.stack && `\n\n${this.state.error.stack}`}
                  </pre>
                </details>
              )}
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                  >
                    Refresh Page
                  </button>
                  <a
                    href="/"
                    className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors inline-block"
                  >
                    Go to Home Page
                  </a>
                </div>
                <div className="flex justify-center text-sm mt-2">
                  <a
                    href="https://github.com/dohsimpson/tasktrove/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-muted-foreground hover:text-foreground underline underline-offset-4"
                  >
                    Check GitHub Issues
                  </a>
                </div>
              </div>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}

/**
 * Loading fallback for Suspense boundaries
 */
function JotaiLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="flex flex-col items-center space-y-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">Loading state management...</p>
      </div>
    </div>
  )
}

/**
 * DevTools wrapper that uses theme context and prevents hydration mismatch
 */
function ThemedDevTools() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only render after hydration to prevent mismatch
  if (!mounted || !DevTools) return null

  return <DevTools position="bottom-right" theme={theme === "dark" ? "dark" : "light"} />
}

/**
 * TanStack Query DevTools wrapper with theme support
 */
function ThemedReactQueryDevtools() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Only render after hydration to prevent mismatch
  if (!mounted) return null

  return <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
}

/**
 * HydrateAtoms component that initializes the queryClientAtom
 * This ensures we reference the same queryClient in both atomWithQuery and other parts of the app
 */
function HydrateAtoms({
  children,
  initialState,
}: {
  children: ReactNode
  initialState?: Iterable<[any, any]>
}) {
  // Always hydrate the queryClientAtom first
  const atomsToHydrate: [any, any][] = [[queryClientAtom, queryClient]]

  if (initialState) {
    // Add the existing initialState atoms
    atomsToHydrate.push(...Array.from(initialState))
  }

  useHydrateAtoms(atomsToHydrate)
  return children
}

/**
 * Jotai Provider wrapper component for TaskTrove
 *
 * Provides atomic state management throughout the app with:
 * - Error boundary for atom errors with graceful recovery
 * - Jotai DevTools integration (bottom-right) in development
 * - TanStack Query DevTools integration (bottom-left) in development
 * - Suspense boundary for async atoms
 * - Proper TypeScript types
 * - Next.js 15 + React 19 compatibility
 * - Dynamic DevTools loading (no hard dependency)
 * - Theme-aware dev tools that match the current theme
 *
 * @param children - Child components to wrap with Jotai provider
 * @param errorFallback - Optional custom error fallback component
 * @param initialState - Optional initial state for SSR hydration
 */
export function JotaiProviderWrapper({
  children,
  errorFallback,
  initialState,
}: JotaiProviderWrapperProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <JotaiErrorBoundary fallback={errorFallback}>
        <JotaiProvider>
          <HydrateAtoms initialState={initialState}>
            {process.env.NODE_ENV === "development" && (
              <>
                <ThemedDevTools />
                <ThemedReactQueryDevtools />
              </>
            )}
            <Suspense fallback={<JotaiLoadingFallback />}>{children}</Suspense>
          </HydrateAtoms>
        </JotaiProvider>
      </JotaiErrorBoundary>
    </QueryClientProvider>
  )
}

/**
 * Export aliases for convenience
 */
export default JotaiProviderWrapper
export { JotaiProviderWrapper as JotaiProvider }

/**
 * Type exports for external use
 */
export type { JotaiProviderWrapperProps }
