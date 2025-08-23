"use client"

import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach } from "vitest"
import { PageFooter } from "./page-footer"
// Mock the atoms instead of importing them
vi.mock("@/lib/atoms", () => ({
  completedTasksTodayAtom: { toString: () => "completedTasksTodayAtom" },
  todayTasksAtom: { toString: () => "todayTasksAtom" },
  toggleTaskAtom: { toString: () => "toggleTaskAtom" },
}))
import type { Task } from "@/lib/types"
import { TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3 } from "@/lib/utils/test-constants"

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
}))

describe("PageFooter Popover Tests", () => {
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
      attachments: [],
      status: "completed",
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
      attachments: [],
      status: "completed",
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
      attachments: [],
      status: "active",
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
      attachments: [],
      status: "active",
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
      attachments: [],
      status: "completed",
      recurringMode: "dueDate",
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should show completed tasks popover with correct count when clicking completed today button", async () => {
    const { useAtomValue, useSetAtom } = await import("jotai")
    const mockUseAtomValue = vi.mocked(useAtomValue)
    const mockUseSetAtom = vi.mocked(useSetAtom)

    mockUseSetAtom.mockReturnValue(vi.fn())
    // Mock the atom values
    mockUseAtomValue
      .mockReturnValueOnce(mockCompletedTasks) // completedTasksTodayAtom
      .mockReturnValueOnce([]) // todayTasksAtom

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
    const { useAtomValue, useSetAtom } = await import("jotai")
    const mockUseAtomValue = vi.mocked(useAtomValue)
    const mockUseSetAtom = vi.mocked(useSetAtom)

    mockUseSetAtom.mockReturnValue(vi.fn())
    // Mock the atom values
    mockUseAtomValue
      .mockReturnValueOnce([]) // completedTasksTodayAtom
      .mockReturnValueOnce(mockDueTodayTasks) // todayTasksAtom

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
})
