import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import { SidebarProvider, useSidebar } from "./sidebar"

// Mock useIsMobile hook
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: vi.fn(),
}))

// Test component to access the sidebar context
const TestComponent = () => {
  const { open, isMobile, openMobile } = useSidebar()
  return (
    <div>
      <div data-testid="open">{open.toString()}</div>
      <div data-testid="isMobile">{isMobile.toString()}</div>
      <div data-testid="openMobile">{openMobile.toString()}</div>
    </div>
  )
}

describe("SidebarProvider", () => {
  it("returns desktop open state when not mobile", async () => {
    // Mock desktop viewport
    const useMobileModule = await import("@/hooks/use-mobile")
    vi.mocked(useMobileModule.useIsMobile).mockReturnValue(false)

    const { getByTestId } = render(
      <SidebarProvider defaultOpen={true}>
        <TestComponent />
      </SidebarProvider>,
    )

    // On desktop, open should be the desktop sidebar state
    expect(getByTestId("open")).toHaveTextContent("true")
    expect(getByTestId("isMobile")).toHaveTextContent("false")
  })

  it("returns mobile open state when mobile", async () => {
    // Mock mobile viewport
    const useMobileModule = await import("@/hooks/use-mobile")
    vi.mocked(useMobileModule.useIsMobile).mockReturnValue(true)

    const { getByTestId } = render(
      <SidebarProvider defaultOpen={false}>
        <TestComponent />
      </SidebarProvider>,
    )

    // On mobile, open should be the mobile sidebar state (openMobile)
    // Since mobile sidebar defaults to false, open should be false
    expect(getByTestId("open")).toHaveTextContent("false")
    expect(getByTestId("isMobile")).toHaveTextContent("true")
    expect(getByTestId("openMobile")).toHaveTextContent("false")
  })
})
