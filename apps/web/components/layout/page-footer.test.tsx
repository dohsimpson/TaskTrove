"use client"

import { render, screen, fireEvent, waitFor } from "@/test-utils"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { PageFooter } from "./page-footer"
// Mock the atoms instead of importing them
vi.mock("@/lib/atoms", () => ({
  completedTasksTodayAtom: { toString: () => "completedTasksTodayAtom" },
  uiFilteredTasksForViewAtom: vi.fn(() => ({ toString: () => "uiFilteredTasksForViewAtom" })),
  toggleTaskAtom: { toString: () => "toggleTaskAtom" },
  toggleTaskPanelWithViewStateAtom: { toString: () => "toggleTaskPanelWithViewStateAtom" },
  // Focus timer atoms
  focusTimerStateAtom: { toString: () => "focusTimerStateAtom" },
  activeFocusTimerAtom: { toString: () => "activeFocusTimerAtom" },
  activeFocusTaskAtom: { toString: () => "activeFocusTaskAtom" },
  isTaskTimerActiveAtom: vi.fn(() => vi.fn(() => false)),
  isAnyTimerRunningAtom: { toString: () => "isAnyTimerRunningAtom" },
  focusTimerTickAtom: { toString: () => "focusTimerTickAtom" },
  currentFocusTimerElapsedAtom: { toString: () => "currentFocusTimerElapsedAtom" },
  focusTimerDisplayAtom: { toString: () => "focusTimerDisplayAtom" },
  focusTimerStatusAtom: { toString: () => "focusTimerStatusAtom" },
  startFocusTimerAtom: { toString: () => "startFocusTimerAtom" },
  pauseFocusTimerAtom: { toString: () => "pauseFocusTimerAtom" },
  stopFocusTimerAtom: { toString: () => "stopFocusTimerAtom" },
  stopAllFocusTimersAtom: { toString: () => "stopAllFocusTimersAtom" },
  focusTimerAtoms: { toString: () => "focusTimerAtoms" },
  formatElapsedTime: vi.fn((ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }),
}))
import type { Task } from "@tasktrove/types/core"
import { TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3 } from "@tasktrove/types/test-constants"

// Mock the ContentPopover component
vi.mock("@/components/ui/content-popover", () => ({
  ContentPopover: ({
    children,
    content,
    ...props
  }: {
    children: React.ReactNode
    content: React.ReactNode
    [key: string]: unknown
  }) => (
    <div data-testid="content-popover" {...props}>
      {children}
      <div data-testid="popover-content">{content}</div>
    </div>
  ),
}))

// Mock the TaskCheckbox component
vi.mock("@/components/ui/custom/task-checkbox", () => ({
  TaskCheckbox: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean
    onCheckedChange?: () => void
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onCheckedChange?.()}
      data-testid="task-checkbox"
    />
  ),
}))

// Mock the TaskDueDate component
vi.mock("@/components/ui/custom/task-due-date", () => ({
  TaskDueDate: ({ dueDate, className }: { dueDate?: Date | null; className?: string }) => (
    <span className={className} data-testid="task-due-date">
      {dueDate ? "Jan 1" : ""}
    </span>
  ),
}))

// Mock useAtomValue and useSetAtom
vi.mock("jotai", async () => {
  const actual = await vi.importActual("jotai")
  return {
    ...actual,
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(),
  }
})

// Mock date-fns format function
vi.mock("date-fns", () => ({
  format: vi.fn((date: Date, formatStr: string) => {
    if (formatStr === "MMM d") {
      return "Jan 1"
    }
    return date.toISOString()
  }),
  isToday: vi.fn(() => true),
  endOfDay: vi.fn((date) => new Date(date)),
  isBefore: vi.fn(() => false),
  parse: vi.fn(() => new Date()),
  parseISO: vi.fn(() => new Date()),
  set: vi.fn((date, updates) => {
    const result = new Date(date)
    Object.assign(result, updates)
    return result
  }),
}))

describe("PageFooter Popover Tests", () => {
  const mockToggleTask = vi.fn()
  const mockToggleTaskPanel = vi.fn()

  const mockCompletedTasks: Task[] = [
    {
      id: TEST_TASK_ID_1,
      title: "Completed Task 1",
      completed: true,
      completedAt: new Date(),
      createdAt: new Date(),
      description: "",
      priority: 1,
      labels: [],
      subtasks: [],
      comments: [],
      recurringMode: "dueDate",
    },
    {
      id: TEST_TASK_ID_2,
      title: "Completed Task 2",
      completed: true,
      completedAt: new Date(),
      createdAt: new Date(),
      description: "",
      priority: 1,
      labels: [],
      subtasks: [],
      comments: [],
      recurringMode: "dueDate",
    },
  ]

  const mockDueTodayTasks: Task[] = [
    {
      id: TEST_TASK_ID_1,
      title: "Due Today Task 1",
      completed: false,
      dueDate: new Date(),
      createdAt: new Date(),
      description: "",
      priority: 1,
      labels: [],
      subtasks: [],
      comments: [],
      recurringMode: "dueDate",
    },
    {
      id: TEST_TASK_ID_2,
      title: "Due Today Task 2",
      completed: false,
      dueDate: new Date(),
      createdAt: new Date(),
      description: "",
      priority: 1,
      labels: [],
      subtasks: [],
      comments: [],
      recurringMode: "dueDate",
    },
    {
      id: TEST_TASK_ID_3,
      title: "Due Today Task 3",
      completed: true,
      dueDate: new Date(),
      completedAt: new Date(),
      createdAt: new Date(),
      description: "",
      priority: 1,
      labels: [],
      subtasks: [],
      comments: [],
      recurringMode: "dueDate",
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const setupMocks = async () => {
    const { useAtomValue, useSetAtom } = await import("jotai")
    const mockUseAtomValue = vi.mocked(useAtomValue)
    const mockUseSetAtom = vi.mocked(useSetAtom)

    mockUseSetAtom.mockImplementation((atom: unknown) => {
      const atomString = atom?.toString?.() || ""
      if (atomString.includes("toggleTaskAtom")) {
        return mockToggleTask
      }
      if (atomString.includes("toggleTaskPanel")) {
        return mockToggleTaskPanel
      }
      return vi.fn()
    })

    return { mockUseAtomValue, mockUseSetAtom }
  }

  it("should show completed tasks popover with correct count when clicking completed today button", async () => {
    const { mockUseAtomValue } = await setupMocks()
    // Mock the atom values
    mockUseAtomValue
      .mockReturnValueOnce(mockCompletedTasks) // completedTasksTodayAtom
      .mockReturnValueOnce([]) // todayTasksAtom
      // Focus timer atoms
      .mockReturnValueOnce(null) // activeFocusTimerAtom
      .mockReturnValueOnce("stopped") // focusTimerStatusAtom
      .mockReturnValueOnce(null) // activeFocusTaskAtom
      .mockReturnValueOnce("0:00") // focusTimerDisplayAtom

    render(<PageFooter />)

    // Check that the footer shows correct count
    expect(screen.getByText("2")).toBeInTheDocument()
    expect(screen.getByText("completed today")).toBeInTheDocument()

    // Find and click the completed today button
    const completedButton = screen.getByRole("button", { name: /completed today/i })
    fireEvent.click(completedButton)

    // Wait for popover content to appear
    await waitFor(() => {
      expect(screen.getByText("Completed Today")).toBeInTheDocument()
    })

    // Check that popover shows correct count in header
    expect(screen.getByText("2 tasks")).toBeInTheDocument()

    // Check that all completed tasks are shown
    expect(screen.getByText("Completed Task 1")).toBeInTheDocument()
    expect(screen.getByText("Completed Task 2")).toBeInTheDocument()

    // Check that tasks have checkboxes
    const checkboxes = screen.getAllByTestId("task-checkbox")
    expect(checkboxes).toHaveLength(2)
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked()
    })
  })

  it("should show due today tasks popover with correct count when clicking due today button", async () => {
    const { mockUseAtomValue } = await setupMocks()
    // Mock the atom values
    mockUseAtomValue
      .mockReturnValueOnce([]) // completedTasksTodayAtom
      .mockReturnValueOnce(mockDueTodayTasks) // todayTasksAtom
      // Focus timer atoms
      .mockReturnValueOnce(null) // activeFocusTimerAtom
      .mockReturnValueOnce("stopped") // focusTimerStatusAtom
      .mockReturnValueOnce(null) // activeFocusTaskAtom
      .mockReturnValueOnce("0:00") // focusTimerDisplayAtom

    render(<PageFooter />)

    // Check that the footer shows correct count
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("due today")).toBeInTheDocument()

    // Find and click the due today button
    const dueButton = screen.getByRole("button", { name: /due today/i })
    fireEvent.click(dueButton)

    // Wait for popover content to appear
    await waitFor(() => {
      expect(screen.getByText("Due Today")).toBeInTheDocument()
    })

    // Check that popover shows correct count in header
    expect(screen.getByText("3 tasks")).toBeInTheDocument()

    // Check that all due today tasks are shown
    expect(screen.getByText("Due Today Task 1")).toBeInTheDocument()
    expect(screen.getByText("Due Today Task 2")).toBeInTheDocument()
    expect(screen.getByText("Due Today Task 3")).toBeInTheDocument()

    // Check that tasks have checkboxes with correct states
    const checkboxes = screen.getAllByTestId("task-checkbox")
    expect(checkboxes).toHaveLength(3)

    // First two should be unchecked (not completed)
    expect(checkboxes[0]).not.toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
    // Third should be checked (completed)
    expect(checkboxes[2]).toBeChecked()
  })

  it("should toggle task panel when clicking on a task in the footer", async () => {
    const { mockUseAtomValue } = await setupMocks()

    // Mock the atom values
    mockUseAtomValue
      .mockReturnValueOnce([]) // completedTasksTodayAtom
      .mockReturnValueOnce(mockDueTodayTasks) // todayTasksAtom
      // Focus timer atoms
      .mockReturnValueOnce(null) // activeFocusTimerAtom
      .mockReturnValueOnce("stopped") // focusTimerStatusAtom
      .mockReturnValueOnce(null) // activeFocusTaskAtom
      .mockReturnValueOnce("0:00") // focusTimerDisplayAtom

    render(<PageFooter />)

    // Open the due today popover
    const dueButton = screen.getByRole("button", { name: /due today/i })
    fireEvent.click(dueButton)

    // Wait for popover content to appear
    await waitFor(() => {
      expect(screen.getByText("Due Today")).toBeInTheDocument()
    })

    // Find and click on the first task (not on the checkbox)
    const taskTitle = screen.getByText("Due Today Task 1")
    const taskContainer = taskTitle.closest("div")
    expect(taskContainer).toBeInTheDocument()

    if (taskContainer) {
      fireEvent.click(taskContainer)
    }

    // Verify that the task panel toggle was called with the correct task
    expect(mockToggleTaskPanel).toHaveBeenCalledWith(mockDueTodayTasks[0])
  })

  it("should not toggle task panel when clicking on interactive elements in footer", async () => {
    const { mockUseAtomValue } = await setupMocks()

    // Mock the atom values
    mockUseAtomValue
      .mockReturnValueOnce([]) // completedTasksTodayAtom
      .mockReturnValueOnce(mockDueTodayTasks) // todayTasksAtom
      // Focus timer atoms
      .mockReturnValueOnce(null) // activeFocusTimerAtom
      .mockReturnValueOnce("stopped") // focusTimerStatusAtom
      .mockReturnValueOnce(null) // activeFocusTaskAtom
      .mockReturnValueOnce("0:00") // focusTimerDisplayAtom

    render(<PageFooter />)

    // Open the due today popover
    const dueButton = screen.getByRole("button", { name: /due today/i })
    fireEvent.click(dueButton)

    // Wait for popover content to appear
    await waitFor(() => {
      expect(screen.getByText("Due Today")).toBeInTheDocument()
    })

    // Click on a checkbox (interactive element)
    const checkboxes = screen.getAllByTestId("task-checkbox")
    expect(checkboxes.length).toBeGreaterThan(0)
    const firstCheckbox = checkboxes[0]
    if (firstCheckbox) {
      fireEvent.click(firstCheckbox)
    }

    // Verify that the task panel toggle was NOT called
    expect(mockToggleTaskPanel).not.toHaveBeenCalled()
    // But the toggle task should have been called
    expect(mockToggleTask).toHaveBeenCalledWith(TEST_TASK_ID_1)
  })
})
