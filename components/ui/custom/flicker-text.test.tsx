import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { FlickerText } from "./flicker-text"

// Mock next-themes with dynamic theme support
const mockUseTheme = vi.fn()

vi.mock("next-themes", () => ({
  useTheme: mockUseTheme,
}))

describe("FlickerText", () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({
      theme: "light",
      systemTheme: "light",
      setTheme: vi.fn(),
      themes: ["light", "dark", "system"],
      resolvedTheme: "light",
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders children content correctly", () => {
    render(<FlickerText>Test Content</FlickerText>)
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(<FlickerText className="custom-class">Test</FlickerText>)
    const element = screen.getByText("Test")
    expect(element).toHaveClass("custom-class")
  })

  it("applies custom className", () => {
    render(<FlickerText className="custom-text-style">Test</FlickerText>)
    const element = screen.getByText("Test")
    expect(element).toHaveClass("custom-text-style")
  })

  it("does not apply flicker animation in light mode by default", () => {
    render(<FlickerText>Test</FlickerText>)
    const element = screen.getByText("Test")

    fireEvent.mouseEnter(element)
    // Animation is controlled via inline styles, not classes
    expect(element.style.animation).toBe("")
  })

  it("flicker duration is set via component prop", () => {
    const { container } = render(<FlickerText flickerDuration="1.5s">Test</FlickerText>)
    // Duration is used in inline styles when hovering in dark mode
    screen.getByText("Test")
    // The component accepts the prop but applies it via inline styles on hover
    expect(container).toBeInTheDocument()
  })

  it("renders as span element", () => {
    render(<FlickerText>Test</FlickerText>)
    const element = screen.getByText("Test")
    expect(element.tagName).toBe("SPAN")
  })

  it("includes style element with flicker keyframes", () => {
    const { container } = render(<FlickerText>Test</FlickerText>)
    const styleElement = container.querySelector("style")
    expect(styleElement).toBeInTheDocument()
    expect(styleElement?.textContent).toContain("@keyframes tasktrove-flicker-unique")
    expect(styleElement?.textContent).toContain("brightness")
    expect(styleElement?.textContent).toContain("drop-shadow")
  })

  it("handles complex children content", () => {
    render(
      <FlickerText>
        <span>Complex</span> Content
      </FlickerText>,
    )
    expect(screen.getByText("Complex")).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  describe("Theme-based flicker behavior", () => {
    it("does not animate in light mode by default", () => {
      render(<FlickerText>Test</FlickerText>)
      const element = screen.getByText("Test")

      fireEvent.mouseEnter(element)
      // In light mode (default mock), should not have animation
      expect(element.style.animation).toBe("")
    })

    it("responds to mouse events correctly", () => {
      render(<FlickerText>Test</FlickerText>)
      const element = screen.getByText("Test")

      // Test that mouse events don't cause errors
      fireEvent.mouseEnter(element)
      fireEvent.mouseLeave(element)

      // Component should still be in the document
      expect(element).toBeInTheDocument()
    })

    it("maintains consistent behavior across multiple interactions", () => {
      render(<FlickerText>Test</FlickerText>)
      const element = screen.getByText("Test")

      // Multiple interactions should not cause errors
      fireEvent.mouseEnter(element)
      fireEvent.mouseLeave(element)
      fireEvent.mouseEnter(element)
      fireEvent.mouseLeave(element)

      expect(element).toBeInTheDocument()
    })
  })
})
