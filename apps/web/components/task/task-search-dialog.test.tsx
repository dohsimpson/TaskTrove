import React from "react"
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { TaskSearchDialog } from "./task-search-dialog"
import { TEST_TASK_ID_1 } from "@tasktrove/types/test-constants"
import type { TaskId } from "@/lib/types"

// Mock TaskSearchContent with proper patterns
vi.mock("./task-search-content", () => ({
  TaskSearchContent: ({
    onTaskSelect,
    placeholder,
  }: {
    onTaskSelect: (id: TaskId) => void
    placeholder?: string
  }) => (
    <div data-testid="task-search-content">
      <input data-testid="mock-search-input" placeholder={placeholder} />
      <div data-testid="mock-task-item" onClick={() => onTaskSelect(TEST_TASK_ID_1)}>
        Mock Task
      </div>
    </div>
  ),
}))

// Mock Dialog components (portal components need mocking)
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({
    children,
    open,
  }: {
    children: React.ReactNode
    open: boolean
    onOpenChange: (open: boolean) => void
  }) => (
    <div data-testid="dialog" data-open={open}>
      {open && children}
    </div>
  ),
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-title">{children}</div>
  ),
}))

describe("TaskSearchDialog", () => {
  let mockOnTaskSelect: Mock
  let mockOnOpenChange: Mock
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    user = userEvent.setup()
    mockOnTaskSelect = vi.fn()
    mockOnOpenChange = vi.fn()
  })

  it("renders dialog when open", () => {
    render(
      <TaskSearchDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Select Parent Task"
        onTaskSelect={mockOnTaskSelect}
      />,
    )

    expect(screen.getByText("Select Parent Task")).toBeInTheDocument()
    expect(screen.getByTestId("task-search-content")).toBeInTheDocument()
  })

  it("does not render when closed", () => {
    render(
      <TaskSearchDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        title="Select Parent Task"
        onTaskSelect={mockOnTaskSelect}
      />,
    )

    expect(screen.queryByText("Select Parent Task")).not.toBeInTheDocument()
    expect(screen.queryByTestId("task-search-content")).not.toBeInTheDocument()
  })

  it("calls onTaskSelect and closes dialog when task is selected", async () => {
    render(
      <TaskSearchDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Select Parent Task"
        onTaskSelect={mockOnTaskSelect}
      />,
    )

    const taskItem = screen.getByTestId("mock-task-item")
    await user.click(taskItem)

    expect(mockOnTaskSelect).toHaveBeenCalledWith(TEST_TASK_ID_1)
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it("passes correct props to TaskSearchContent", () => {
    render(
      <TaskSearchDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Select Parent Task"
        onTaskSelect={mockOnTaskSelect}
        excludeTaskIds={[TEST_TASK_ID_1]}
        placeholder="Search for parent task..."
      />,
    )

    expect(screen.getByTestId("task-search-content")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("Search for parent task...")).toBeInTheDocument()
  })

  it("handles onOpenChange from dialog", () => {
    render(
      <TaskSearchDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title="Select Parent Task"
        onTaskSelect={mockOnTaskSelect}
      />,
    )

    // Dialog would normally trigger onOpenChange through user interaction
    // For testing, we verify the prop is passed correctly
    expect(screen.getByTestId("dialog")).toHaveAttribute("data-open", "true")
  })

  it("displays custom title", () => {
    const customTitle = "Convert 3 selected tasks to subtasks"

    render(
      <TaskSearchDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        title={customTitle}
        onTaskSelect={mockOnTaskSelect}
      />,
    )

    expect(screen.getByText(customTitle)).toBeInTheDocument()
  })
})
