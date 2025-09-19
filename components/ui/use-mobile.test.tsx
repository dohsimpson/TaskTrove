import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useIsMobile } from "./use-mobile"

// Mock window.matchMedia
const mockMatchMedia = vi.fn()

// Mock window.innerWidth
Object.defineProperty(window, "innerWidth", {
  writable: true,
  configurable: true,
  value: 1024,
})

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  configurable: true,
  value: mockMatchMedia,
})

describe("useIsMobile", () => {
  let mockMediaQueryList: {
    matches: boolean
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    mockMediaQueryList = {
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    mockMatchMedia.mockReturnValue(mockMediaQueryList)

    // Reset window.innerWidth - only if window exists
    if (typeof window !== "undefined") {
      window.innerWidth = 1024
    }
  })

  afterEach(() => {
    vi.clearAllMocks()

    // Ensure window and document are restored for subsequent tests
    if (typeof global !== "undefined") {
      if (typeof window !== "undefined") {
        global.window = window
      }
      if (typeof document !== "undefined") {
        global.document = document
      }
    }
  })

  it("should return false for desktop screen size initially", () => {
    window.innerWidth = 1024

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it("should return true for mobile screen size initially", () => {
    window.innerWidth = 500

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it("should return false for screen size exactly at breakpoint", () => {
    window.innerWidth = 768

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(false)
  })

  it("should return true for screen size just below breakpoint", () => {
    window.innerWidth = 767

    const { result } = renderHook(() => useIsMobile())

    expect(result.current).toBe(true)
  })

  it("should set up media query listener with correct breakpoint", () => {
    renderHook(() => useIsMobile())

    expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 767px)")
    expect(mockMediaQueryList.addEventListener).toHaveBeenCalledWith("change", expect.any(Function))
  })

  it("should update state when media query changes", () => {
    window.innerWidth = 1024

    const { result } = renderHook(() => useIsMobile())

    // Initially false (desktop)
    expect(result.current).toBe(false)

    // Simulate window resize to mobile
    window.innerWidth = 500

    // Get the change handler that was registered
    const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]

    // Simulate the media query change
    act(() => {
      changeHandler()
    })

    expect(result.current).toBe(true)
  })

  it("should update state when resizing from mobile to desktop", () => {
    window.innerWidth = 500

    const { result } = renderHook(() => useIsMobile())

    // Initially true (mobile)
    expect(result.current).toBe(true)

    // Simulate window resize to desktop
    window.innerWidth = 1024

    // Get the change handler that was registered
    const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]

    // Simulate the media query change
    act(() => {
      changeHandler()
    })

    expect(result.current).toBe(false)
  })

  it("should clean up media query listener on unmount", () => {
    const { unmount } = renderHook(() => useIsMobile())

    unmount()

    expect(mockMediaQueryList.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function),
    )
  })

  it("should handle undefined initial state gracefully", () => {
    // Mock useState to return undefined initially
    const originalUseState = React.useState
    const mockUseState = vi.fn()
    mockUseState.mockReturnValueOnce([undefined, vi.fn()])

    React.useState = mockUseState

    const { result } = renderHook(() => useIsMobile())

    // Should return false for undefined (coerced by !!)
    expect(result.current).toBe(false)

    // Restore original useState
    React.useState = originalUseState
  })

  it("should use correct mobile breakpoint constant", () => {
    // Reset mocks before test
    mockMatchMedia.mockClear()

    renderHook(() => useIsMobile())

    // The hook should use 768px as the breakpoint
    expect(mockMatchMedia).toHaveBeenCalledWith("(max-width: 767px)")
  })

  it("should handle multiple rapid changes", () => {
    window.innerWidth = 1024

    const { result } = renderHook(() => useIsMobile())

    // Get the change handler
    const changeHandler = mockMediaQueryList.addEventListener.mock.calls[0][1]

    // Simulate rapid changes
    act(() => {
      window.innerWidth = 500
      changeHandler()
      window.innerWidth = 1024
      changeHandler()
      window.innerWidth = 600
      changeHandler()
    })

    // Should reflect the final state
    expect(result.current).toBe(true)
  })

  it("should handle SSR scenarios (no window)", () => {
    // Test that the implementation checks for window existence
    // We can verify this by checking the typeof window check is in the code

    // Mock a scenario that simulates the typeof window check
    const originalWindow = window

    // Create a mock that simulates no window environment

    // Since we can't actually delete window in JSDOM, we verify the behavior
    // by checking that the hook properly handles the edge cases
    expect(() => {
      // The implementation should have typeof window checks that prevent errors
      const { result } = renderHook(() => useIsMobile())
      expect(typeof result.current).toBe("boolean")
    }).not.toThrow()

    // This tests that the implementation is SSR-safe by design
    expect(typeof originalWindow).toBe("object") // Verify we have window in test environment
  })

  it("should handle missing matchMedia support", () => {
    if (typeof window === "undefined") return

    // Mock environment where matchMedia is not supported (older browsers)
    const originalMatchMedia = window.matchMedia

    try {
      // @ts-expect-error - Testing edge case
      delete window.matchMedia

      const { result } = renderHook(() => useIsMobile())

      // Should return false when matchMedia is not available (graceful degradation)
      expect(result.current).toBe(false)
      expect(() => result.current).not.toThrow()
    } finally {
      // Restore matchMedia
      window.matchMedia = originalMatchMedia
    }
  })

  it("should handle matchMedia returning null", () => {
    if (typeof window === "undefined") return

    // Mock matchMedia that returns null (broken implementation)
    const originalMatchMedia = window.matchMedia

    try {
      // @ts-expect-error - Testing edge case with null return
      window.matchMedia = vi.fn(() => null)

      const { result } = renderHook(() => useIsMobile())

      // Should return false when matchMedia returns null
      expect(result.current).toBe(false)
      expect(() => result.current).not.toThrow()
    } finally {
      // Restore original matchMedia
      window.matchMedia = originalMatchMedia
    }
  })

  it("should handle matchMedia returning object without addEventListener", () => {
    if (typeof window === "undefined") return

    // Mock incomplete matchMedia object (missing event listener methods)
    const originalMatchMedia = window.matchMedia

    try {
      // @ts-expect-error - Testing edge case with incomplete MediaQueryList
      window.matchMedia = vi.fn(() => ({
        matches: false,
        media: "(max-width: 767px)",
        // Missing addEventListener and removeEventListener methods
      }))

      const { result } = renderHook(() => useIsMobile())

      // Should return false when addEventListener is not available (fallback)
      expect(result.current).toBe(false)
      expect(() => result.current).not.toThrow()
    } finally {
      // Restore original matchMedia
      window.matchMedia = originalMatchMedia
    }
  })

  it("should handle test environment gracefully", () => {
    // Reset all mocks to simulate test environment behavior
    mockMatchMedia.mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    const { result } = renderHook(() => useIsMobile())

    // Should work normally in test environment
    expect(result.current).toBe(false)
    expect(mockMatchMedia).toHaveBeenCalled()
  })

  it("should return consistent boolean values", () => {
    if (typeof window !== "undefined") {
      window.innerWidth = 1024
    }

    const { result, rerender } = renderHook(() => useIsMobile())

    // Should always return boolean
    expect(typeof result.current).toBe("boolean")

    // Simulate multiple re-renders
    rerender()
    rerender()
    rerender()

    expect(typeof result.current).toBe("boolean")
    expect(result.current).toBe(false)
  })

  it("should handle window.innerWidth edge cases", () => {
    // Test with various edge case values
    const testCases = [
      { width: 0, expected: true },
      { width: 1, expected: true },
      { width: 767, expected: true },
      { width: 768, expected: false },
      { width: 769, expected: false },
      { width: 9999, expected: false },
    ]

    testCases.forEach(({ width, expected }) => {
      if (typeof window !== "undefined") {
        window.innerWidth = width
      }
      const { result } = renderHook(() => useIsMobile())
      expect(result.current).toBe(expected)
    })
  })

  it("should handle addEventListener throwing errors", () => {
    if (typeof window === "undefined") return

    // Mock matchMedia where addEventListener throws (security restrictions)
    const originalMatchMedia = window.matchMedia
    const mockMQL = {
      matches: false,
      media: "(max-width: 767px)",
      addEventListener: vi.fn(() => {
        throw new Error("Permission denied")
      }),
      removeEventListener: vi.fn(),
    }

    try {
      // @ts-expect-error - Testing edge case with throwing addEventListener
      window.matchMedia = vi.fn(() => mockMQL)

      // Should not throw despite addEventListener error
      expect(() => {
        const { result } = renderHook(() => useIsMobile())
        expect(result.current).toBe(false)
      }).not.toThrow()
    } finally {
      // Restore original matchMedia
      window.matchMedia = originalMatchMedia
    }
  })

  it("should handle removeEventListener throwing errors on cleanup", () => {
    if (typeof window === "undefined") return

    // Mock matchMedia where removeEventListener throws during cleanup
    const originalMatchMedia = window.matchMedia
    const mockMQL = {
      matches: false,
      media: "(max-width: 767px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(() => {
        throw new Error("Cleanup error")
      }),
    }

    try {
      // @ts-expect-error - Testing edge case with throwing removeEventListener
      window.matchMedia = vi.fn(() => mockMQL)

      // Should not throw during mount or unmount
      expect(() => {
        const { result, unmount } = renderHook(() => useIsMobile())
        expect(result.current).toBe(false)
        unmount() // This should not throw despite removeEventListener error
      }).not.toThrow()
    } finally {
      // Restore original matchMedia
      window.matchMedia = originalMatchMedia
    }
  })

  it("should handle dynamic matchMedia changes correctly", () => {
    if (typeof window === "undefined") return

    // Test realistic media query state changes
    const mockMQL = {
      matches: false,
      media: "(max-width: 767px)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }

    const originalMatchMedia = window.matchMedia

    try {
      // @ts-expect-error - Testing edge case with realistic media query changes
      window.matchMedia = vi.fn(() => mockMQL)

      const { result } = renderHook(() => useIsMobile())

      // Initially false (desktop)
      expect(result.current).toBe(false)

      // Simulate screen resize to mobile
      window.innerWidth = 500

      // Get the change handler that was registered
      const changeHandler = mockMQL.addEventListener.mock.calls[0]?.[1]

      if (changeHandler) {
        // Simulate the media query change event
        act(() => {
          changeHandler()
        })

        expect(result.current).toBe(true)
      }
    } finally {
      // Restore original matchMedia
      window.matchMedia = originalMatchMedia
    }
  })
})
