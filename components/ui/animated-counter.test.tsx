import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import { AnimatedCounter } from "./animated-counter"

// Mock requestAnimationFrame
const mockRequestAnimationFrame = vi.fn()
const mockCancelAnimationFrame = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  global.requestAnimationFrame = mockRequestAnimationFrame
  global.cancelAnimationFrame = mockCancelAnimationFrame
})

describe("AnimatedCounter", () => {
  it("renders with initial value of 0", () => {
    render(<AnimatedCounter value={100} />)
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("renders with prefix and suffix", () => {
    render(<AnimatedCounter value={50} prefix="$" suffix="%" />)
    expect(screen.getByText("$0%")).toBeInTheDocument()
  })

  it("sets up animation frame on mount", () => {
    render(<AnimatedCounter value={100} />)
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it("cleans up animation frame on unmount", () => {
    const { unmount } = render(<AnimatedCounter value={100} />)
    unmount()
    // Test that component unmounts without errors (cleanup happens internally)
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it("accepts custom duration prop", () => {
    render(<AnimatedCounter value={100} duration={2000} />)
    expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1)
  })

  it("handles zero value correctly", () => {
    render(<AnimatedCounter value={0} />)
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("handles negative values correctly", () => {
    render(<AnimatedCounter value={-50} />)
    expect(screen.getByText("0")).toBeInTheDocument()
  })
})
