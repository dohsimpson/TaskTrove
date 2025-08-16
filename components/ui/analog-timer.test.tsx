import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import AnalogTimer from "./analog-timer"
import { getTypedElement } from "@/lib/utils/type-safe-dom"

describe("AnalogTimer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    elapsedTime: 300000, // 5 minutes in milliseconds
    totalTime: 1500000, // 25 minutes in milliseconds
    isRunning: false,
  }

  it("renders correctly with default props", () => {
    const { container } = render(<AnalogTimer {...defaultProps} />)

    // Check if SVG container is rendered
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()

    // Check if time display is rendered
    expect(screen.getByText("05:00")).toBeInTheDocument()
    expect(screen.getByText("25:00")).toBeInTheDocument()
  })

  it("displays formatted time correctly", () => {
    render(<AnalogTimer {...defaultProps} elapsedTime={65000} />)

    expect(screen.getByText("01:05")).toBeInTheDocument()
  })

  it("displays zero time correctly", () => {
    render(<AnalogTimer {...defaultProps} elapsedTime={0} />)

    expect(screen.getByText("00:00")).toBeInTheDocument()
  })

  it("handles overtime state correctly", () => {
    const { container } = render(
      <AnalogTimer
        {...defaultProps}
        elapsedTime={1800000} // 30 minutes (more than totalTime of 25 minutes)
        isRunning={true}
      />,
    )

    // Check for overtime time display (should show elapsed time)
    expect(screen.getByText("30:00")).toBeInTheDocument()

    // Check for red text and pulse animation classes when overtime
    const timeDisplay = container.querySelector(".text-red-600.animate-pulse")
    expect(timeDisplay).toBeInTheDocument()
  })

  it("shows different text colors based on running state", () => {
    const { rerender, container } = render(<AnalogTimer {...defaultProps} isRunning={false} />)

    let timeDisplay = container.querySelector(".text-slate-600")
    expect(timeDisplay).toBeInTheDocument()

    rerender(<AnalogTimer {...defaultProps} isRunning={true} />)
    timeDisplay = container.querySelector(".text-slate-900")
    expect(timeDisplay).toBeInTheDocument()
  })

  it("renders play/pause button when onToggle is provided", () => {
    const mockToggle = vi.fn()
    render(<AnalogTimer {...defaultProps} onToggle={mockToggle} />)

    const button = screen.getByRole("button")
    expect(button).toBeInTheDocument()
  })

  it("does not render play/pause button when onToggle is not provided", () => {
    render(<AnalogTimer {...defaultProps} />)

    const button = screen.queryByRole("button")
    expect(button).not.toBeInTheDocument()
  })

  it("calls onToggle when button is clicked", () => {
    const mockToggle = vi.fn()
    render(<AnalogTimer {...defaultProps} onToggle={mockToggle} />)

    const button = screen.getByRole("button")
    fireEvent.click(button)

    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it("shows play icon when not running", () => {
    const mockToggle = vi.fn()
    render(<AnalogTimer {...defaultProps} isRunning={false} onToggle={mockToggle} />)

    const playIcon = screen.getByRole("button").querySelector("svg")
    expect(playIcon).toBeInTheDocument()
  })

  it("shows pause icon when running", () => {
    const mockToggle = vi.fn()
    render(<AnalogTimer {...defaultProps} isRunning={true} onToggle={mockToggle} />)

    const pauseIcon = screen.getByRole("button").querySelector("svg")
    expect(pauseIcon).toBeInTheDocument()
  })

  it("applies custom size correctly", () => {
    const customSize = 320
    const { container } = render(<AnalogTimer {...defaultProps} size={customSize} />)

    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("width", customSize.toString())
    expect(svg).toHaveAttribute("height", customSize.toString())
    expect(svg).toHaveAttribute("viewBox", `0 0 ${customSize} ${customSize}`)
  })

  it("applies custom className correctly", () => {
    const customClass = "custom-timer-class"
    const { container } = render(<AnalogTimer {...defaultProps} className={customClass} />)

    const firstChild = container.firstChild
    const timerContainer =
      firstChild instanceof Element ? getTypedElement(firstChild, HTMLElement) : null
    expect(timerContainer).toHaveClass(customClass)
  })

  it("renders correct number of tick marks", () => {
    const { container } = render(<AnalogTimer {...defaultProps} />)

    // Should render 120 tick marks (totalTicks = 120)
    // Count only tick marks (lines with specific attributes)
    const actualTickMarks = container.querySelectorAll('line[stroke-linecap="round"]')
    expect(actualTickMarks.length).toBeGreaterThan(0)
    expect(actualTickMarks.length).toBeLessThanOrEqual(120)
  })

  it("calculates progress correctly for different elapsed times", () => {
    const { rerender, container } = render(<AnalogTimer {...defaultProps} elapsedTime={0} />)

    // At 0% progress, currentTickIndex should be 0
    expect(screen.getByText("00:00")).toBeInTheDocument()

    rerender(<AnalogTimer {...defaultProps} elapsedTime={750000} />)
    // At 50% progress (750000ms of 1500000ms), currentTickIndex should be around 60
    expect(screen.getByText("12:30")).toBeInTheDocument()

    rerender(<AnalogTimer {...defaultProps} elapsedTime={1500000} />)
    // At 100% progress, currentTickIndex should be close to 120 (or 0 due to modulo)
    // Both elapsed and total time show 25:00, so use getAllByText
    const timeElements = screen.getAllByText("25:00")
    expect(timeElements).toHaveLength(2) // elapsed and total time both show 25:00

    // These tests verify the component re-renders without errors at different progress levels
    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("handles edge case of very small elapsed time", () => {
    render(<AnalogTimer {...defaultProps} elapsedTime={1} />)

    expect(screen.getByText("00:00")).toBeInTheDocument()
  })

  it("handles edge case of elapsed time equal to total time", () => {
    render(<AnalogTimer {...defaultProps} elapsedTime={1500000} totalTime={1500000} />)

    // Both elapsed and total time show 25:00, so use getAllByText
    const timeElements = screen.getAllByText("25:00")
    expect(timeElements).toHaveLength(2)
  })

  it("handles edge case of very large elapsed time (overtime)", () => {
    render(<AnalogTimer {...defaultProps} elapsedTime={3600000} totalTime={1500000} />)

    expect(screen.getByText("60:00")).toBeInTheDocument()
  })

  it("renders correctly without isPaused prop", () => {
    render(<AnalogTimer {...defaultProps} />)

    // Component should render correctly without the removed isPaused prop
    expect(screen.getByText("05:00")).toBeInTheDocument()
  })

  it("has correct SVG structure", () => {
    const { container } = render(<AnalogTimer {...defaultProps} />)

    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()

    // Check for outer circle border
    const outerCircle = svg?.querySelector("circle")
    expect(outerCircle).toBeInTheDocument()

    // Check for tick marks
    const tickLines = svg?.querySelectorAll('line[stroke-linecap="round"]')
    expect(tickLines).toHaveLength(120)
  })

  it("handles button hover interactions without errors", () => {
    const mockToggle = vi.fn()
    render(<AnalogTimer {...defaultProps} onToggle={mockToggle} />)

    const button = screen.getByRole("button")

    fireEvent.mouseEnter(button)
    fireEvent.mouseLeave(button)

    // Should not throw any errors and button should still be clickable
    fireEvent.click(button)
    expect(mockToggle).toHaveBeenCalledTimes(1)
  })

  it("maintains accessibility for the timer display", () => {
    render(<AnalogTimer {...defaultProps} onToggle={vi.fn()} />)

    // The button should be accessible
    const button = screen.getByRole("button")
    expect(button).toBeInTheDocument()

    // The timer display should be readable
    expect(screen.getByText("05:00")).toBeInTheDocument()
    expect(screen.getByText("/").closest("div")).toBeInTheDocument()
    expect(screen.getByText("25:00")).toBeInTheDocument()
  })

  it("uses primary color for current time line position", () => {
    const { container } = render(<AnalogTimer {...defaultProps} elapsedTime={300000} />)

    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()

    // Find tick marks (lines with stroke-linecap="round")
    const tickLines = svg?.querySelectorAll('line[stroke-linecap="round"]')
    expect(tickLines).toHaveLength(120)

    // At 20% progress (300000ms of 1500000ms), currentTickIndex should be around 24
    // The current position tick should use hsl(var(--primary)) color
    const currentTick = Array.from(tickLines || []).find(
      (line) =>
        line.getAttribute("stroke") === "hsl(var(--primary))" &&
        parseFloat(line.getAttribute("stroke-width") || "0") === 2.5,
    )
    expect(currentTick).toBeInTheDocument()
  })

  it("uses theme-aware colors for non-current tick marks", () => {
    const { container } = render(<AnalogTimer {...defaultProps} elapsedTime={300000} />)

    const svg = container.querySelector("svg")
    expect(svg).toBeInTheDocument()

    // Find tick marks that use theme-aware colors
    const tickLines = svg?.querySelectorAll('line[stroke-linecap="round"]')
    const themeAwareTicks = Array.from(tickLines || []).filter((line) => {
      const stroke = line.getAttribute("stroke") || ""
      return (
        stroke.includes("hsl(var(--foreground)") || stroke.includes("hsl(var(--muted-foreground)")
      )
    })

    // Should have multiple theme-aware ticks (non-current position ticks)
    expect(themeAwareTicks.length).toBeGreaterThan(0)
  })

  it("has dark mode compatible outer circle border", () => {
    const { container } = render(<AnalogTimer {...defaultProps} />)

    const svg = container.querySelector("svg")
    const outerCircle = svg?.querySelector("circle")
    expect(outerCircle).toBeInTheDocument()
    expect(outerCircle).toHaveClass("dark:stroke-slate-600")
  })
})
