import React, { ReactElement } from "react"
import { render, RenderOptions } from "@testing-library/react"
import { TestJotaiProvider, type HydrateValues } from "./jotai-mocks"
import { MockRouter } from "./mock-router"
import { LanguageProvider } from "@tasktrove/i18n"
import { i18nConfig } from "@/lib/i18n/config"

// Use a simple div wrapper instead of ThemeProvider for tests
const TestThemeProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

// Enhanced router configuration interface
interface RouterConfig {
  pathname?: string
  searchParams?: URLSearchParams | string | Record<string, string>
  query?: Record<string, string | string[] | undefined>
}

// Enhanced mock providers wrapper for testing
const AllTheProviders = ({
  children,
  initialAtomValues,
  routerConfig = {},
}: {
  children: React.ReactNode
  initialAtomValues?: HydrateValues
  routerConfig?: RouterConfig
}) => {
  return (
    <MockRouter {...routerConfig}>
      <TestThemeProvider>
        <LanguageProvider config={i18nConfig} initialLanguage="en">
          <TestJotaiProvider initialValues={initialAtomValues}>{children}</TestJotaiProvider>
        </LanguageProvider>
      </TestThemeProvider>
    </MockRouter>
  )
}

// Enhanced render options interface
interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  initialAtomValues?: HydrateValues
  routerConfig?: RouterConfig
  // Legacy support
  routerProps?: RouterConfig
  // Wrapper support for backward compatibility
  wrapper?: React.ComponentType<{ children: React.ReactNode }>
}

/**
 * Custom render function with enhanced provider support
 *
 * @example
 * ```tsx
 * import { render } from '@/test-utils'
 *
 * // Basic usage
 * render(<Component />)
 *
 * // With router configuration
 * render(<Component />, {
 *   routerConfig: {
 *     pathname: '/projects/123',
 *     searchParams: { tab: 'settings' },
 *     query: { id: '123' }
 *   }
 * })
 *
 * // With atom values
 * render(<Component />, {
 *   initialAtomValues: [[someAtom, someValue]],
 *   routerConfig: { pathname: '/today' }
 * })
 * ```
 */
const customRender = (ui: ReactElement, options?: CustomRenderOptions) => {
  const {
    initialAtomValues,
    routerConfig,
    routerProps, // Legacy support
    wrapper: CustomWrapper,
    ...renderOptions
  } = options || {}

  // Support both new routerConfig and legacy routerProps
  const finalRouterConfig = routerConfig || routerProps || {}

  return render(ui, {
    wrapper: ({ children }) => {
      const wrappedChildren = (
        <AllTheProviders initialAtomValues={initialAtomValues} routerConfig={finalRouterConfig}>
          {children}
        </AllTheProviders>
      )

      // Apply custom wrapper if provided
      return CustomWrapper ? <CustomWrapper>{wrappedChildren}</CustomWrapper> : wrappedChildren
    },
    ...renderOptions,
  })
}

export * from "@testing-library/react"
export { customRender as render }
