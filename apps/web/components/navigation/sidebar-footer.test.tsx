import React from "react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen } from "@/test-utils"
import { AppSidebarFooter } from "./sidebar-footer"
import { SidebarProvider } from "@/components/ui/custom/sidebar"

// Mock NavUser component since context menu functionality is now there
vi.mock("./nav-user", () => ({
  NavUser: () => (
    <div data-testid="nav-user">
      <span>Test User</span>
    </div>
  ),
}))

// Mock update checker hook
vi.mock("@/hooks/use-update-checker", () => ({
  useUpdateChecker: () => ({
    hasUpdate: false,
    latestVersion: null,
    releaseUrl: null,
  }),
}))

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <div data-testid="sidebar" className="bg-sidebar">
        {children}
      </div>
    </SidebarProvider>
  )
}

describe("AppSidebarFooter", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders without errors", () => {
    expect(() => render(<AppSidebarFooter />, { wrapper: TestWrapper })).not.toThrow()
  })

  it("renders NavUser component", () => {
    render(<AppSidebarFooter />, { wrapper: TestWrapper })

    const navUser = screen.getByTestId("nav-user")
    expect(navUser).toBeInTheDocument()
  })

  it("does not show update notification when no update available", () => {
    render(<AppSidebarFooter />, { wrapper: TestWrapper })

    expect(screen.queryByText(/new version/)).not.toBeInTheDocument()
  })

  it("renders properly with sidebar provider", () => {
    render(<AppSidebarFooter />, { wrapper: TestWrapper })

    // Should render within sidebar context without errors
    const navUser = screen.getByTestId("nav-user")
    expect(navUser).toBeInTheDocument()
  })

  it("has proper layout structure", () => {
    render(<AppSidebarFooter />, { wrapper: TestWrapper })

    // NavUser should be present
    const navUser = screen.getByTestId("nav-user")
    expect(navUser).toBeInTheDocument()

    // Should have the correct CSS class for footer
    const footer = document.querySelector('[data-sidebar="footer"]')
    expect(footer).toHaveClass("bg-background", "border-t")
  })
})
