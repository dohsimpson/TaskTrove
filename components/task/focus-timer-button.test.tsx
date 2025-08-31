import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { FocusTimerButton } from "./focus-timer-button"
import { TEST_TASK_ID_1 } from "@/lib/utils/test-constants"

// Mock the atoms and their hooks
const mockIsTaskTimerActive = vi.fn()
const mockTimerStatus = vi.fn(() => "stopped")
const mockActiveTimer = vi.fn()
const mockStartTimer = vi.fn()
const mockPauseTimer = vi.fn()
const mockStopTimer = vi.fn()

// Mock jotai hooks
vi.mock("jotai", () => ({
  useAtomValue: vi.fn((atom: unknown) => {
    // Mock the return based on a simple identifier check
    const atomStr = String(atom)
    if (atomStr.includes("isTaskTimerActive") || atom === "isTaskTimerActiveAtom") {
      return mockIsTaskTimerActive
    }
    if (atomStr.includes("focusTimerStatus") || atom === "focusTimerStatusAtom") {
      return mockTimerStatus()
    }
    if (atomStr.includes("activeFocusTimer") || atom === "activeFocusTimerAtom") {
      return mockActiveTimer()
    }
    return null
  }),
  useSetAtom: vi.fn((atom: unknown) => {
    const atomStr = String(atom)
    if (atomStr.includes("startFocusTimer") || atom === "startFocusTimerAtom") {
      return mockStartTimer
    }
    if (atomStr.includes("pauseFocusTimer") || atom === "pauseFocusTimerAtom") {
      return mockPauseTimer
    }
    if (atomStr.includes("stopFocusTimer") || atom === "stopFocusTimerAtom") {
      return mockStopTimer
    }
    return vi.fn()
  }),
}))

// Mock the atoms module directly
vi.mock("@/lib/atoms", () => ({
  isTaskTimerActiveAtom: "isTaskTimerActiveAtom",
  focusTimerStatusAtom: "focusTimerStatusAtom",
  activeFocusTimerAtom: "activeFocusTimerAtom",
  startFocusTimerAtom: "startFocusTimerAtom",
  pauseFocusTimerAtom: "pauseFocusTimerAtom",
  stopFocusTimerAtom: "stopFocusTimerAtom",
}))

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, ...props }: React.ComponentPropsWithoutRef<"button">) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}))

// Mock lucide-react icons
vi.mock("lucide-react", () => ({
  Timer: () => <div data-testid="timer-icon">Timer</div>,
  Play: () => <div data-testid="play-icon">Play</div>,
  Pause: () => <div data-testid="pause-icon">Pause</div>,
  Square: () => <div data-testid="square-icon">Square</div>,
}))

// Mock utils
vi.mock("@/lib/utils", () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(" "),
}))

const testTaskId = TEST_TASK_ID_1

const renderFocusTimerButton = (props = {}) => {
  const defaultProps = {
    taskId: testTaskId,
    ...props,
  }
  return render(<FocusTimerButton {...defaultProps} />)
}

describe("FocusTimerButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default mock return values
    mockIsTaskTimerActive.mockReturnValue(false)
    mockTimerStatus.mockReturnValue("stopped")
    mockActiveTimer.mockReturnValue(null)
  })

  describe("Initial State (No Active Timer)", () => {
    it("renders start timer button when no timer is active", () => {
      renderFocusTimerButton()

      const startButton = screen.getByRole("button")
      expect(startButton).toBeInTheDocument()
      expect(startButton).toHaveAttribute("title", "Start focus timer")
      expect(screen.getByTestId("timer-icon")).toBeInTheDocument()
    })

    it("starts timer when start button is clicked", () => {
      renderFocusTimerButton()

      const startButton = screen.getByRole("button")
      fireEvent.click(startButton)

      expect(mockStartTimer).toHaveBeenCalledWith(testTaskId)
    })

    it("does not render if another task has an active timer", () => {
      mockActiveTimer.mockReturnValue({
        taskId: "different-task-id",
        startedAt: new Date().toISOString(),
        elapsed: 0,
      })

      const { container } = renderFocusTimerButton()
      expect(container.firstChild).toBeNull()
    })
  })

  describe("Running Timer State", () => {
    beforeEach(() => {
      mockIsTaskTimerActive.mockReturnValue(true)
      mockTimerStatus.mockReturnValue("running")
      mockActiveTimer.mockReturnValue({
        taskId: testTaskId,
        startedAt: new Date().toISOString(),
        elapsed: 0,
      })
    })

    it("renders pause button when timer is running", () => {
      renderFocusTimerButton()

      const pauseButton = screen.getByRole("button", { name: "Pause" })
      expect(pauseButton).toBeInTheDocument()
      expect(pauseButton).toHaveAttribute("title", "Pause timer")
    })

    it("renders stop button when timer is running", () => {
      renderFocusTimerButton()

      const stopButton = screen.getByRole("button", { name: "Square" })
      expect(stopButton).toBeInTheDocument()
      expect(stopButton).toHaveAttribute("title", "Stop timer")
    })

    it("pauses timer when pause button is clicked", () => {
      renderFocusTimerButton()

      const pauseButton = screen.getByRole("button", { name: "Pause" })
      fireEvent.click(pauseButton)

      expect(mockPauseTimer).toHaveBeenCalledWith(testTaskId)
    })

    it("stops timer when stop button is clicked", () => {
      renderFocusTimerButton()

      const stopButton = screen.getByRole("button", { name: "Square" })
      fireEvent.click(stopButton)

      expect(mockStopTimer).toHaveBeenCalledWith(testTaskId)
    })

    it("applies running state styling", () => {
      renderFocusTimerButton()

      const pauseButton = screen.getByRole("button", { name: "Pause" })
      expect(pauseButton).toHaveClass("text-green-600", "opacity-100")
    })
  })

  describe("Paused Timer State", () => {
    beforeEach(() => {
      mockIsTaskTimerActive.mockReturnValue(true)
      mockTimerStatus.mockReturnValue("paused")
      mockActiveTimer.mockReturnValue({
        taskId: testTaskId,
        startedAt: new Date().toISOString(),
        pausedAt: new Date().toISOString(),
        elapsed: 30000, // 30 seconds
      })
    })

    it("renders resume button when timer is paused", () => {
      renderFocusTimerButton()

      const resumeButton = screen.getByRole("button", { name: "Play" })
      expect(resumeButton).toBeInTheDocument()
      expect(resumeButton).toHaveAttribute("title", "Resume timer")
    })

    it("resumes timer when resume button is clicked", () => {
      renderFocusTimerButton()

      const resumeButton = screen.getByRole("button", { name: "Play" })
      fireEvent.click(resumeButton)

      expect(mockStartTimer).toHaveBeenCalledWith(testTaskId)
    })

    it("applies paused state styling", () => {
      renderFocusTimerButton()

      const resumeButton = screen.getByRole("button", { name: "Play" })
      expect(resumeButton).toHaveClass("text-yellow-600", "opacity-100")
    })
  })

  describe("Event Handling", () => {
    it("calls timer functions when buttons are clicked", () => {
      // Start button click
      renderFocusTimerButton()
      const startButton = screen.getByRole("button", { name: "Timer" })
      fireEvent.click(startButton)
      expect(mockStartTimer).toHaveBeenCalledWith(testTaskId)

      // Reset mocks for running state test
      vi.clearAllMocks()
      mockIsTaskTimerActive.mockReturnValue(true)
      mockTimerStatus.mockReturnValue("running")
      mockActiveTimer.mockReturnValue({
        taskId: testTaskId,
        startedAt: new Date().toISOString(),
        elapsed: 0,
      })

      // Pause button click
      renderFocusTimerButton()
      const pauseButton = screen.getByRole("button", { name: "Pause" })
      fireEvent.click(pauseButton)
      expect(mockPauseTimer).toHaveBeenCalledWith(testTaskId)

      // Stop button click
      const stopButton = screen.getByRole("button", { name: "Square" })
      fireEvent.click(stopButton)
      expect(mockStopTimer).toHaveBeenCalledWith(testTaskId)
    })
  })

  describe("Custom Styling", () => {
    it("applies custom className when provided", () => {
      const { container } = renderFocusTimerButton({ className: "custom-class" })

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  describe("Variant Support", () => {
    it("applies default sizing when no variant is specified", () => {
      renderFocusTimerButton()

      const startButton = screen.getByRole("button")
      expect(startButton).toHaveClass("h-6", "w-6")
    })

    it("applies default sizing when variant is 'default'", () => {
      renderFocusTimerButton({ variant: "default" })

      const startButton = screen.getByRole("button")
      expect(startButton).toHaveClass("h-6", "w-6")
    })

    it("applies compact sizing when variant is 'compact'", () => {
      renderFocusTimerButton({ variant: "compact" })

      const startButton = screen.getByRole("button")
      expect(startButton).toHaveClass("h-5", "w-5")
    })

    it("applies compact sizing when variant is 'kanban'", () => {
      renderFocusTimerButton({ variant: "kanban" })

      const startButton = screen.getByRole("button")
      expect(startButton).toHaveClass("h-5", "w-5")
    })
  })
})
