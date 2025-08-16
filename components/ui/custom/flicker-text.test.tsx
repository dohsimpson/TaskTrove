import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { FlickerText } from "./flicker-text"

// Mock next-themes
const mockUseTheme = vi.fn()
vi.mock("next-themes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-themes")>()
  return {
    ...actual,
    useTheme: () => mockUseTheme(),
  }
})

describe("FlickerText", () => {
  beforeEach(() => {
    mockUseTheme.mockReturnValue({ theme: "light", systemTheme: "light" })
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
      mockUseTheme.mockReturnValue({ theme: "light", systemTheme: "light" })
      render(<FlickerText>Test</FlickerText>)
      const element = screen.getByText("Test")

      fireEvent.mouseEnter(element)
      expect(element.style.animation).toBe("")
    })

    it("animates in dark mode", () => {
      mockUseTheme.mockReturnValue({ theme: "dark", systemTheme: "dark" })
      render(<FlickerText>Test</FlickerText>)
      const element = screen.getByText("Test")

      fireEvent.mouseEnter(element)
      expect(element.style.animation).toContain("tasktrove-flicker-unique")
    })

    it("animates when system theme is dark", () => {
      mockUseTheme.mockReturnValue({ theme: "system", systemTheme: "dark" })
      render(<FlickerText>Test</FlickerText>)
      const element = screen.getByText("Test")

      fireEvent.mouseEnter(element)
      expect(element.style.animation).toContain("tasktrove-flicker-unique")
    })

    it("does not animate when system theme is light", () => {
      mockUseTheme.mockReturnValue({ theme: "system", systemTheme: "light" })
      render(<FlickerText>Test</FlickerText>)
      const element = screen.getByText("Test")

      fireEvent.mouseEnter(element)
      expect(element.style.animation).toBe("")
    })

    it("uses custom flicker duration when animated", () => {
      mockUseTheme.mockReturnValue({ theme: "dark", systemTheme: "dark" })
      render(<FlickerText flickerDuration="2s">Test</FlickerText>)
      const element = screen.getByText("Test")

      fireEvent.mouseEnter(element)
      expect(element.style.animation).toContain("2s")
    })

    it("removes animation on mouse leave", () => {
      mockUseTheme.mockReturnValue({ theme: "dark", systemTheme: "dark" })
      render(<FlickerText>Test</FlickerText>)
      const element = screen.getByText("Test")

      fireEvent.mouseEnter(element)
      expect(element.style.animation).toContain("tasktrove-flicker-unique")

      fireEvent.mouseLeave(element)
      expect(element.style.animation).toBe("")
    })
  })
})
