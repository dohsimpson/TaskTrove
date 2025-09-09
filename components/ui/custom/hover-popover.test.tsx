import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { HoverPopover } from "./hover-popover"

// Mock the UI components
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover" data-open={open}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
  PopoverContent: ({
    children,
    onMouseEnter,
    onMouseLeave,
    ...props
  }: {
    children: React.ReactNode
    onMouseEnter?: () => void
    onMouseLeave?: () => void
    [key: string]: unknown
  }) => (
    <div
      data-testid="popover-content"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      {...props}
    >
      {children}
    </div>
  ),
}))

describe("HoverPopover", () => {
  beforeEach(() => {
    vi.clearAllTimers()
    vi.clearAllMocks()
  })

  it("renders trigger and content", () => {
    render(
      <HoverPopover content={<div>Popover Content</div>}>
        <button>Trigger</button>
      </HoverPopover>,
    )

    expect(screen.getByText("Trigger")).toBeInTheDocument()
    expect(screen.getByText("Popover Content")).toBeInTheDocument()
  })

  it("handles hover events without errors", () => {
    render(
      <HoverPopover content={<div>Content</div>}>
        <button>Trigger</button>
      </HoverPopover>,
    )

    const trigger = screen.getByTestId("popover-trigger")

    // Should handle hover events without errors
    expect(() => {
      fireEvent.mouseEnter(trigger)
      fireEvent.mouseLeave(trigger)
    }).not.toThrow()
  })

  it("renders in disabled mode", () => {
    render(
      <HoverPopover content={<div>Content</div>} disabled>
        <button>Trigger</button>
      </HoverPopover>,
    )

    expect(screen.getByText("Trigger")).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("handles mouse events on content", () => {
    render(
      <HoverPopover content={<div>Content</div>}>
        <button>Trigger</button>
      </HoverPopover>,
    )

    const content = screen.getByTestId("popover-content")

    expect(() => {
      fireEvent.mouseEnter(content)
      fireEvent.mouseLeave(content)
    }).not.toThrow()
  })

  it("passes through contentProps to PopoverContent", () => {
    render(
      <HoverPopover
        content={<div>Content</div>}
        contentProps={{ className: "custom-class", align: "start" }}
      >
        <button>Trigger</button>
      </HoverPopover>,
    )

    const content = screen.getByTestId("popover-content")
    expect(content).toHaveClass("custom-class")
    expect(content).toHaveAttribute("align", "start")
  })
})
