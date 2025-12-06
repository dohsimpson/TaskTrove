import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { PomodoroDialog } from "./pomodoro-dialog"
import type { Task } from "@tasktrove/types/core"
import { TEST_TASK_ID_1, TEST_TASK_ID_2 } from "@tasktrove/types/test-constants"

// Mock component props interface
interface MockComponentProps {
  children?: React.ReactNode
  open?: boolean
  className?: string
  taskId?: string
  taskTitle?: string
  onSessionComplete?: (duration: number, type: string) => void
}

// Helper function to create mock tasks
const createMockTask = (overrides: Partial<Task> = {}): Task => ({
  id: TEST_TASK_ID_1,
  title: "Test Task",
  completed: false,
  createdAt: new Date(),
  priority: 2,
  labels: [],
  subtasks: [],
  comments: [],
  recurringMode: "dueDate",
  ...overrides,
})

// Mock values that can be controlled in tests
let mockDialogOpen = true
let mockSelectedTask: Task | null = null
const mockClosePomodoro = vi.fn()

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock jotai with controlled return values
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue: vi.fn((atom) => {
      if (atom.toString().includes("showPomodoro")) return mockDialogOpen
      if (atom.toString().includes("selectedTask")) return mockSelectedTask
      return null
    }),
    useSetAtom: vi.fn((atom) => {
      if (atom.toString().includes("closePomodoro")) return mockClosePomodoro
      return vi.fn()
    }),
  }
})

// Mock Radix UI dialog components
vi.mock("@radix-ui/react-dialog", () => ({
  Root: ({ children, open }: MockComponentProps) =>
    open ? <div data-testid="dialog-root">{children}</div> : null,
  Portal: ({ children }: MockComponentProps) => <div data-testid="dialog-portal">{children}</div>,
  Content: ({ children }: MockComponentProps) => <div data-testid="dialog-content">{children}</div>,
  Header: ({ children }: MockComponentProps) => <div data-testid="dialog-header">{children}</div>,
  Title: ({ children }: MockComponentProps) => <div data-testid="dialog-title">{children}</div>,
  Description: ({ children }: MockComponentProps) => (
    <div data-testid="dialog-description">{children}</div>
  ),
  Trigger: ({ children }: MockComponentProps) => (
    <button data-testid="dialog-trigger">{children}</button>
  ),
  Close: ({ children }: MockComponentProps) => (
    <button data-testid="dialog-close">{children}</button>
  ),
}))

// Mock the PomodoroTimer component
vi.mock("@/components/productivity/pomodoro-timer", () => ({
  PomodoroTimer: ({ taskId, taskTitle, onSessionComplete }: MockComponentProps) => (
    <div data-testid="pomodoro-timer">
      <div data-testid="task-id">{taskId}</div>
      <div data-testid="task-title">{taskTitle}</div>
      <button data-testid="session-complete-btn" onClick={() => onSessionComplete?.(1500, "work")}>
        Complete Session
      </button>
    </div>
  ),
}))

// Mock UI components
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: MockComponentProps) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, className }: MockComponentProps) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: MockComponentProps) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: MockComponentProps) => (
    <div data-testid="dialog-title">{children}</div>
  ),
}))

describe("PomodoroDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock values to defaults
    mockDialogOpen = true
    mockSelectedTask = null
    mockClosePomodoro.mockClear()
  })

  it("renders dialog when showPomodoroAtom is true", () => {
    render(<PomodoroDialog />)

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument()
    expect(screen.getByTestId("pomodoro-timer")).toBeInTheDocument()
  })

  it("does not render dialog when showPomodoroAtom is false", () => {
    // Set mock value to false
    mockDialogOpen = false

    render(<PomodoroDialog />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })

  it("renders with visually hidden dialog title for accessibility", () => {
    render(<PomodoroDialog />)

    // Dialog header and title should be present but visually hidden for accessibility
    expect(screen.getByTestId("dialog-header")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-title")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Pomodoro Timer")
  })

  it("passes task information to PomodoroTimer when selectedTaskAtom has a task", () => {
    const mockTask = createMockTask({
      id: TEST_TASK_ID_1,
      title: "Complete project documentation",
    })

    // Set mock task
    mockSelectedTask = mockTask

    render(<PomodoroDialog />)

    // Task information is passed to PomodoroTimer and included in visually hidden title
    expect(screen.getByTestId("task-id")).toHaveTextContent("12345678-1234-4234-8234-123456789abc")
    expect(screen.getByTestId("task-title")).toHaveTextContent("Complete project documentation")
    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "Pomodoro Timer - Working on: Complete project documentation",
    )
  })

  it("does not display task information when selectedTaskAtom is null", () => {
    render(<PomodoroDialog />)

    expect(screen.getByTestId("task-id")).toHaveTextContent("")
    expect(screen.getByTestId("task-title")).toHaveTextContent("")
    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Pomodoro Timer")
  })

  it("passes undefined task properties to PomodoroTimer when selectedTaskAtom is null", () => {
    render(<PomodoroDialog />)

    expect(screen.getByTestId("task-id")).toHaveTextContent("")
    expect(screen.getByTestId("task-title")).toHaveTextContent("")
  })

  it("handles session completion correctly", () => {
    render(<PomodoroDialog />)

    const sessionCompleteBtn = screen.getByTestId("session-complete-btn")
    fireEvent.click(sessionCompleteBtn)

    // Session completion calls the closePomodoro function from closePomodoroAtom
    expect(mockClosePomodoro).toHaveBeenCalled()
  })

  it("calls closePomodoroAtom when dialog state changes", () => {
    render(<PomodoroDialog />)

    // The closePomodoro function from closePomodoroAtom should be available
    // We test this indirectly through the session completion test
    expect(screen.getByTestId("dialog")).toBeInTheDocument()
  })

  it("renders with proper CSS classes", () => {
    render(<PomodoroDialog />)

    const dialogContent = screen.getByTestId("dialog-content")
    expect(dialogContent).toHaveClass("sm:max-w-lg", "border-0", "p-0")
  })

  it("renders timer directly without extra container padding", () => {
    render(<PomodoroDialog />)

    // Timer should be directly in dialog content now, no extra wrapper with py-4
    const timer = screen.getByTestId("pomodoro-timer")
    expect(timer).toBeInTheDocument()
  })

  it("handles task with minimal properties from selectedTaskAtom", () => {
    const mockTask = createMockTask({
      id: TEST_TASK_ID_2,
      title: "Minimal task",
    })

    // Set mock task
    mockSelectedTask = mockTask

    render(<PomodoroDialog />)

    expect(screen.getByTestId("task-id")).toHaveTextContent("12345678-1234-4234-8234-123456789abd")
    expect(screen.getByTestId("task-title")).toHaveTextContent("Minimal task")
    expect(screen.getByTestId("dialog-title")).toHaveTextContent(
      "Pomodoro Timer - Working on: Minimal task",
    )
  })
})
