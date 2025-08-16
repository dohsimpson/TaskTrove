import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useContextMenuVisibility } from "./use-context-menu-visibility"

describe("useContextMenuVisibility", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  it("should initialize with correct default values", () => {
    const { result } = renderHook(() => useContextMenuVisibility(false, false))

    expect(result.current.isVisible).toBe(false)
    expect(result.current.isMenuOpen).toBe(false)
    expect(typeof result.current.handleMenuOpenChange).toBe("function")
  })

  it("should be visible when hovered", () => {
    const { result } = renderHook(() => useContextMenuVisibility(true, false))

    expect(result.current.isVisible).toBe(true)
  })

  it("should be visible when selected", () => {
    const { result } = renderHook(() => useContextMenuVisibility(false, true))

    expect(result.current.isVisible).toBe(true)
  })

  it("should be visible when menu is open", () => {
    const { result } = renderHook(() => useContextMenuVisibility(false, false))

    act(() => {
      result.current.handleMenuOpenChange(true)
    })

    expect(result.current.isVisible).toBe(true)
    expect(result.current.isMenuOpen).toBe(true)
  })

  it("should prevent flicker when menu closes while hovering", () => {
    const { result, rerender } = renderHook(
      ({ isHovered }) => useContextMenuVisibility(isHovered, false),
      { initialProps: { isHovered: true } },
    )

    // Open menu
    act(() => {
      result.current.handleMenuOpenChange(true)
    })

    expect(result.current.isVisible).toBe(true)
    expect(result.current.isMenuOpen).toBe(true)

    // Close menu while still hovering
    act(() => {
      result.current.handleMenuOpenChange(false)
    })

    // Should still be visible due to isMenuClosing delay
    expect(result.current.isVisible).toBe(true)
    expect(result.current.isMenuOpen).toBe(false)

    // Fast-forward the delay
    act(() => {
      vi.advanceTimersByTime(150)
    })

    // Should still be visible because still hovering
    expect(result.current.isVisible).toBe(true)

    // Stop hovering
    rerender({ isHovered: false })

    // Should now be hidden
    expect(result.current.isVisible).toBe(false)
  })

  it("should use custom delay when provided", () => {
    const { result } = renderHook(() => useContextMenuVisibility(false, false, { delay: 300 }))

    // Open and close menu
    act(() => {
      result.current.handleMenuOpenChange(true)
    })

    act(() => {
      result.current.handleMenuOpenChange(false)
    })

    // Should still be visible due to isMenuClosing
    expect(result.current.isVisible).toBe(true)

    // Fast-forward less than custom delay
    act(() => {
      vi.advanceTimersByTime(250)
    })

    // Should still be in closing state
    expect(result.current.isVisible).toBe(true)

    // Fast-forward past custom delay
    act(() => {
      vi.advanceTimersByTime(100)
    })

    // Should now be hidden
    expect(result.current.isVisible).toBe(false)
  })

  it("should clear timeout if menu reopens during closing period", () => {
    const { result } = renderHook(() => useContextMenuVisibility(false, false))

    // Open and close menu
    act(() => {
      result.current.handleMenuOpenChange(true)
    })

    act(() => {
      result.current.handleMenuOpenChange(false)
    })

    expect(result.current.isVisible).toBe(true)

    // Reopen menu before delay expires
    act(() => {
      result.current.handleMenuOpenChange(true)
    })

    expect(result.current.isVisible).toBe(true)
    expect(result.current.isMenuOpen).toBe(true)

    // Fast-forward past original delay
    act(() => {
      vi.advanceTimersByTime(200)
    })

    // Should still be visible because menu is open
    expect(result.current.isVisible).toBe(true)
  })

  it("should cleanup timeout on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(global, "clearTimeout")

    const { result, unmount } = renderHook(() => useContextMenuVisibility(false, false))

    // Open and close menu to create a timeout
    act(() => {
      result.current.handleMenuOpenChange(true)
    })

    act(() => {
      result.current.handleMenuOpenChange(false)
    })

    unmount()

    // clearTimeout should have been called during cleanup
    expect(clearTimeoutSpy).toHaveBeenCalled()

    clearTimeoutSpy.mockRestore()
  })

  it("should handle multiple rapid open/close cycles gracefully", () => {
    const { result } = renderHook(() => useContextMenuVisibility(false, false))

    // Rapid open/close cycles
    act(() => {
      result.current.handleMenuOpenChange(true)
      result.current.handleMenuOpenChange(false)
      result.current.handleMenuOpenChange(true)
      result.current.handleMenuOpenChange(false)
      result.current.handleMenuOpenChange(true)
    })

    expect(result.current.isVisible).toBe(true)
    expect(result.current.isMenuOpen).toBe(true)

    // Close final time
    act(() => {
      result.current.handleMenuOpenChange(false)
    })

    expect(result.current.isVisible).toBe(true)
    expect(result.current.isMenuOpen).toBe(false)

    // Fast-forward delay
    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(result.current.isVisible).toBe(false)
  })
})
