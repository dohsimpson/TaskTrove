import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { fireEvent, render } from "@/test-utils"
import { SIDEBAR_WIDTH_PX_DEFAULT } from "@tasktrove/constants"
import { sideBarWidthAtom } from "@tasktrove/atoms/ui/views"
import { SidebarProvider, SidebarRail, useSidebar } from "./sidebar"

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

const WidthComponent = () => {
  const { sidebarWidth, setSidebarWidth } = useSidebar()
  return (
    <div>
      <div data-testid="sidebarWidth">{sidebarWidth}</div>
      <button data-testid="setSidebarWidth" onClick={() => setSidebarWidth(420)}>
        set width
      </button>
    </div>
  )
}

describe("SidebarProvider", () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

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

  it("exposes sidebarWidth with default value and persists updates", async () => {
    const useMobileModule = await import("@/hooks/use-mobile")
    vi.mocked(useMobileModule.useIsMobile).mockReturnValue(false)

    const { getByTestId } = render(
      <SidebarProvider>
        <WidthComponent />
      </SidebarProvider>,
    )

    expect(getByTestId("sidebarWidth")).toHaveTextContent(SIDEBAR_WIDTH_PX_DEFAULT.toString())

    fireEvent.click(getByTestId("setSidebarWidth"))

    expect(getByTestId("sidebarWidth")).toHaveTextContent("420")
  })

  it("initializes sidebarWidth from localStorage when available", async () => {
    const useMobileModule = await import("@/hooks/use-mobile")
    vi.mocked(useMobileModule.useIsMobile).mockReturnValue(false)

    const { getByTestId } = render(
      <SidebarProvider>
        <WidthComponent />
      </SidebarProvider>,
      {
        initialAtomValues: [[sideBarWidthAtom, 360]],
      },
    )

    expect(getByTestId("sidebarWidth")).toHaveTextContent("360")
  })

  it("updates sidebarWidth when dragging SidebarRail", async () => {
    const useMobileModule = await import("@/hooks/use-mobile")
    vi.mocked(useMobileModule.useIsMobile).mockReturnValue(false)

    const { getByTestId } = render(
      <SidebarProvider defaultOpen>
        <SidebarRail data-testid="sidebar-rail" />
        <WidthComponent />
      </SidebarProvider>,
    )

    const rail = getByTestId("sidebar-rail")

    fireEvent.pointerDown(rail, { clientX: 200, button: 0, pointerId: 1 })
    fireEvent.pointerMove(window, { clientX: 260, pointerId: 1 })
    fireEvent.pointerUp(window, { clientX: 260, pointerId: 1 })

    expect(parseInt(getByTestId("sidebarWidth").textContent || "0", 10)).toBeGreaterThan(256)
  })

  it("does not toggle sidebar when dragging the rail", async () => {
    const useMobileModule = await import("@/hooks/use-mobile")
    vi.mocked(useMobileModule.useIsMobile).mockReturnValue(false)

    const { getByTestId } = render(
      <SidebarProvider defaultOpen>
        <SidebarRail data-testid="sidebar-rail" />
        <TestComponent />
      </SidebarProvider>,
    )

    const rail = getByTestId("sidebar-rail")

    fireEvent.pointerDown(rail, { clientX: 200, button: 0, pointerId: 2 })
    fireEvent.pointerMove(window, { clientX: 260, pointerId: 2 })
    fireEvent.pointerUp(window, { clientX: 260, pointerId: 2 })
    fireEvent.click(rail)

    expect(getByTestId("open")).toHaveTextContent("true")
  })

  it("reverts width when pointer interaction is cancelled", async () => {
    const useMobileModule = await import("@/hooks/use-mobile")
    vi.mocked(useMobileModule.useIsMobile).mockReturnValue(false)

    const { getByTestId } = render(
      <SidebarProvider defaultOpen>
        <SidebarRail data-testid="sidebar-rail" />
        <WidthComponent />
      </SidebarProvider>,
    )

    const rail = getByTestId("sidebar-rail")

    fireEvent.pointerDown(rail, { clientX: 200, button: 0, pointerId: 3 })
    fireEvent.pointerMove(window, { clientX: 260, pointerId: 3 })
    fireEvent.pointerCancel(window, { pointerId: 3 })

    expect(getByTestId("sidebarWidth")).toHaveTextContent(SIDEBAR_WIDTH_PX_DEFAULT.toString())
  })

  it("supports keyboard resizing via arrow keys", async () => {
    const useMobileModule = await import("@/hooks/use-mobile")
    vi.mocked(useMobileModule.useIsMobile).mockReturnValue(false)

    const { getByTestId } = render(
      <SidebarProvider defaultOpen>
        <SidebarRail data-testid="sidebar-rail" />
        <WidthComponent />
      </SidebarProvider>,
    )

    const rail = getByTestId("sidebar-rail")
    rail.focus()

    fireEvent.keyDown(rail, { key: "ArrowRight" })
    fireEvent.keyDown(rail, { key: "ArrowRight", shiftKey: true })

    const width = parseInt(getByTestId("sidebarWidth").textContent || "0", 10)
    // Two steps: default + shifted step
    expect(width).toBe(SIDEBAR_WIDTH_PX_DEFAULT + 48)
  })

  it("toggles sidebar when rail is clicked without dragging", async () => {
    const useMobileModule = await import("@/hooks/use-mobile")
    vi.mocked(useMobileModule.useIsMobile).mockReturnValue(false)

    const { getByTestId } = render(
      <SidebarProvider defaultOpen>
        <SidebarRail data-testid="sidebar-rail" />
        <TestComponent />
      </SidebarProvider>,
    )

    const rail = getByTestId("sidebar-rail")

    fireEvent.pointerDown(rail, { clientX: 200, button: 0, pointerId: 4 })
    fireEvent.pointerUp(rail, { clientX: 200, pointerId: 4 })
    fireEvent.click(rail)

    expect(getByTestId("open")).toHaveTextContent("false")
  })
})
