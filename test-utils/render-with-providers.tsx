import React, { ReactElement } from "react"
import { render, RenderOptions } from "@testing-library/react"
import { TestJotaiProvider } from "./jotai-mocks"
import { MockRouter } from "./mock-router"
import { ThemeProvider } from "next-themes"

// Mock providers wrapper for testing
const AllTheProviders = ({
  children,
  initialAtomValues = [],
  routerProps = {},
}: {
  children: React.ReactNode
  initialAtomValues?: Array<[any, any]>
  routerProps?: any
}) => {
  return (
    <MockRouter {...routerProps}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TestJotaiProvider initialValues={initialAtomValues}>{children}</TestJotaiProvider>
      </ThemeProvider>
    </MockRouter>
  )
}

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & {
    initialAtomValues?: Array<[any, any]>
    routerProps?: any
  },
) => {
  const { initialAtomValues, routerProps, ...renderOptions } = options || {}

  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders initialAtomValues={initialAtomValues} routerProps={routerProps}>
        {children}
      </AllTheProviders>
    ),
    ...renderOptions,
  })
}

export * from "@testing-library/react"
export { customRender as render }
