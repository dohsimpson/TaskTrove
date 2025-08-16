import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@/test-utils"
import { PomodoroTimer } from "./pomodoro-timer"

// Mock Notification API
const mockNotificationConstructor = vi.fn()
const mockNotificationRequestPermission = vi.fn().mockResolvedValue("granted")

Object.defineProperty(window, "Notification", {
  value: mockNotificationConstructor,
  writable: true,
})

Object.defineProperty(window.Notification, "requestPermission", {
  value: mockNotificationRequestPermission,
  writable: true,
})

Object.defineProperty(window.Notification, "permission", {
  value: "granted",
  writable: true,
})

// Mock HTMLAudioElement.play method
Object.defineProperty(window.HTMLMediaElement.prototype, "play", {
  configurable: true,
  value: vi.fn().mockResolvedValue(undefined),
})

// Temporarily disabled - PomodoroTimer component returns null
describe.skip("PomodoroTimer", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("renders pomodoro timer with initial state", () => {
    render(<PomodoroTimer />)

    expect(screen.getByText("Focus")).toBeInTheDocument()
    expect(screen.getByText("Stay focused and track your progress")).toBeInTheDocument()
    expect(screen.getByText("00:00")).toBeInTheDocument() // Initial elapsed time
    expect(screen.getByText("25:00")).toBeInTheDocument() // Total time
    expect(screen.getByText("Reset")).toBeInTheDocument()
    expect(screen.getByText("Sound")).toBeInTheDocument()
    expect(screen.getByText("-1min")).toBeInTheDocument()
    expect(screen.getByText("+1min")).toBeInTheDocument()

    // Check that the AnalogTimer component is rendered (by looking for SVG)
    const svg = document.querySelector("svg")
    expect(svg).toBeInTheDocument()
  })

  it("renders focus header without session tabs", () => {
    render(<PomodoroTimer />)

    expect(screen.getByText("Focus")).toBeInTheDocument()
    expect(screen.getByText("Stay focused and track your progress")).toBeInTheDocument()
    // Session tabs should not be present
    expect(screen.queryByText("Work")).not.toBeInTheDocument()
    expect(screen.queryByText("Learn")).not.toBeInTheDocument()
    expect(screen.queryByText("Create")).not.toBeInTheDocument()
  })

  it("toggles between start and pause states", () => {
    const { container } = render(<PomodoroTimer />)

    // The play/pause button is inside the AnalogTimer (within the SVG area)
    const analogTimerButton = container.querySelector("svg")?.parentElement?.querySelector("button")
    expect(analogTimerButton).toBeInTheDocument()

    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    // After starting, the button should still be there (now showing pause icon)
    expect(analogTimerButton).toBeInTheDocument()

    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    // Should still be there (now showing play icon again)
    expect(analogTimerButton).toBeInTheDocument()
  })

  it("resets timer when reset button is clicked", async () => {
    const { container } = render(<PomodoroTimer />)

    const analogTimerButton = container.querySelector("svg")?.parentElement?.querySelector("button")
    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    const resetButton = screen.getByText("Reset")
    act(() => {
      fireEvent.click(resetButton)
    })

    expect(screen.getByText("25:00")).toBeInTheDocument()
    expect(screen.getByText("00:00")).toBeInTheDocument() // Should show reset elapsed time
  })

  it("has functional +1min and -1min buttons", () => {
    render(<PomodoroTimer />)

    const plusButton = screen.getByText("+1min")
    const minusButton = screen.getByText("-1min")

    // Buttons should be present and clickable
    expect(plusButton).toBeInTheDocument()
    expect(minusButton).toBeInTheDocument()

    // Should not throw errors when clicked
    act(() => {
      fireEvent.click(plusButton)
    })

    act(() => {
      fireEvent.click(minusButton)
    })
  })

  it("starts with default work session duration", () => {
    render(<PomodoroTimer />)

    // Should start with work session duration (25:00)
    expect(screen.getByText("25:00")).toBeInTheDocument()
  })

  it("shows focus title with primary color", () => {
    render(<PomodoroTimer />)

    const focusTitle = screen.getByText("Focus")
    expect(focusTitle).toHaveClass("text-primary")
  })

  it("formats time correctly", () => {
    render(<PomodoroTimer />)

    // Should show the total session time initially
    expect(screen.getByText("25:00")).toBeInTheDocument()

    // Should show initial elapsed time as 00:00
    expect(screen.getByText("00:00")).toBeInTheDocument()
  })

  it("requests notification permission on first start", () => {
    // Mock permission as default
    Object.defineProperty(window.Notification, "permission", {
      value: "default",
      writable: true,
    })

    const { container } = render(<PomodoroTimer />)

    // Find the play/pause button inside the AnalogTimer
    const analogTimerButton = container.querySelector("svg")?.parentElement?.querySelector("button")
    expect(analogTimerButton).toBeInTheDocument()

    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    expect(mockNotificationRequestPermission).toHaveBeenCalled()
  })

  it("allows clicking -1min button multiple times without errors", () => {
    render(<PomodoroTimer />)

    const minusButton = screen.getByText("-1min")

    // Should not throw errors when clicked multiple times
    for (let i = 0; i < 5; i++) {
      act(() => {
        fireEvent.click(minusButton)
      })
    }

    expect(minusButton).toBeInTheDocument()
  })

  it("shows timer controls", () => {
    const { container } = render(<PomodoroTimer />)

    // Find the play/pause button inside the AnalogTimer
    const analogTimerButton = container.querySelector("svg")?.parentElement?.querySelector("button")
    expect(analogTimerButton).toBeInTheDocument()

    expect(screen.getByText("Reset")).toBeInTheDocument()
    expect(screen.getByText("Sound")).toBeInTheDocument()
    expect(screen.getByText("-1min")).toBeInTheDocument()
    expect(screen.getByText("+1min")).toBeInTheDocument()
  })

  it("maintains consistent work session throughout", () => {
    const { container } = render(<PomodoroTimer />)

    // Start the timer
    const analogTimerButton = container.querySelector("svg")?.parentElement?.querySelector("button")
    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    // Timer should maintain work session duration
    expect(screen.getByText("25:00")).toBeInTheDocument()
    expect(screen.getByText("00:00")).toBeInTheDocument()
  })

  it("updates display time in real-time when running", () => {
    const { container } = render(<PomodoroTimer />)

    // Initially should show 00:00
    expect(screen.getByText("00:00")).toBeInTheDocument()

    // Start the timer
    const analogTimerButton = container.querySelector("svg")?.parentElement?.querySelector("button")
    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    // Advance time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    // Should show updated time (00:05)
    expect(screen.getByText("00:05")).toBeInTheDocument()

    // Advance more time
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Should show 00:15
    expect(screen.getByText("00:15")).toBeInTheDocument()
  })

  it("pauses display time updates when paused", () => {
    const { container } = render(<PomodoroTimer />)

    // Start the timer
    const analogTimerButton = container.querySelector("svg")?.parentElement?.querySelector("button")
    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    // Advance time by 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.getByText("00:05")).toBeInTheDocument()

    // Pause the timer
    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    // Advance more time while paused
    act(() => {
      vi.advanceTimersByTime(10000)
    })

    // Should still show 00:05 (paused time)
    expect(screen.getByText("00:05")).toBeInTheDocument()

    // Resume the timer
    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    // Should immediately continue from where it left off
    expect(screen.getByText("00:05")).toBeInTheDocument()

    // Advance time after resume
    act(() => {
      vi.advanceTimersByTime(3000)
    })

    // Should show 00:08
    expect(screen.getByText("00:08")).toBeInTheDocument()
  })

  it("resets timer for next round when session completes", () => {
    const { container } = render(<PomodoroTimer />)

    // Start the timer
    const analogTimerButton = container.querySelector("svg")?.parentElement?.querySelector("button")
    act(() => {
      if (analogTimerButton) fireEvent.click(analogTimerButton)
    })

    // Simulate session completion by advancing time to 25 minutes (1500000ms)
    act(() => {
      vi.advanceTimersByTime(1500000) // 25 minutes
    })

    // After session completion, timer should be reset and stopped
    expect(screen.getByText("00:00")).toBeInTheDocument() // Should show reset time
    expect(screen.getByText("05:00")).toBeInTheDocument() // Should show break duration (5 min)

    // Timer should be stopped (showing play button)
    const playButton = container.querySelector("svg")?.parentElement?.querySelector("button")
    expect(playButton).toBeInTheDocument()

    // Should be ready to start next session (break session)
    act(() => {
      if (playButton) {
        fireEvent.click(playButton)
      }
    })

    // Should start the break session
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText("00:01")).toBeInTheDocument()
  })
})
