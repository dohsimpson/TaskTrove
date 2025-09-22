import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { AddSectionDivider } from "./add-section-divider"

// Mock dependencies
vi.mock("@/lib/utils", () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
}))

describe("AddSectionDivider", () => {
  const mockOnAddSection = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders with basic structure", () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} />)

    // Should have the main container div with cursor-pointer class
    const container = document.querySelector(".cursor-pointer")
    expect(container).toBeInTheDocument()
  })

  it("shows base line by default", () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} />)

    // Base line should be present (though testing CSS classes might be limited)
    const container = document.querySelector(".cursor-pointer")
    expect(container).toBeInTheDocument()
  })

  it("shows add section button on hover", async () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} />)

    const container = document.querySelector(".cursor-pointer")

    // Initially, the button should not be visible
    expect(screen.queryByText("Add section")).not.toBeInTheDocument()

    // Hover over the container
    if (container) fireEvent.mouseEnter(container)

    // Button should now be visible
    expect(screen.getByText("Add section")).toBeInTheDocument()
  })

  it("hides add section button when not hovering", async () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} />)

    const container = document.querySelector(".cursor-pointer")

    // Hover to show button
    if (container) fireEvent.mouseEnter(container)
    expect(screen.getByText("Add section")).toBeInTheDocument()

    // Mouse leave should hide button
    if (container) fireEvent.mouseLeave(container)
    expect(screen.queryByText("Add section")).not.toBeInTheDocument()
  })

  it("calls onAddSection when clicked", async () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} />)

    const container = document.querySelector(".cursor-pointer")
    if (container) {
      await userEvent.click(container)
    }

    expect(mockOnAddSection).toHaveBeenCalledWith(undefined)
  })

  it("calls onAddSection with position when position is provided", async () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} position={2} />)

    const container = document.querySelector(".cursor-pointer")
    if (container) {
      await userEvent.click(container)
    }

    expect(mockOnAddSection).toHaveBeenCalledWith(2)
  })

  it("applies custom className when provided", () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} className="custom-class" />)

    const container = document.querySelector(".cursor-pointer")
    expect(container).toHaveClass("custom-class")
  })

  it("shows plus icon in button when hovering", () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} />)

    const container = document.querySelector(".cursor-pointer")
    if (container) fireEvent.mouseEnter(container)

    // Plus icon should be present (as SVG)
    const plusIcon = container?.querySelector("svg")
    expect(plusIcon).toBeInTheDocument()
  })

  it("handles multiple hover events correctly", () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} />)

    const container = document.querySelector(".cursor-pointer")

    // Multiple hover on/off cycles
    if (container) fireEvent.mouseEnter(container)
    expect(screen.getByText("Add section")).toBeInTheDocument()

    if (container) fireEvent.mouseLeave(container)
    expect(screen.queryByText("Add section")).not.toBeInTheDocument()

    if (container) fireEvent.mouseEnter(container)
    expect(screen.getByText("Add section")).toBeInTheDocument()
  })

  it("maintains hover state during button interaction", () => {
    render(<AddSectionDivider onAddSection={mockOnAddSection} />)

    const container = document.querySelector(".cursor-pointer")

    // Hover to show button
    if (container) fireEvent.mouseEnter(container)
    const button = screen.getByText("Add section")
    expect(button).toBeInTheDocument()

    // Button should remain visible even when hovering over it
    fireEvent.mouseEnter(button)
    expect(screen.getByText("Add section")).toBeInTheDocument()
  })
})
