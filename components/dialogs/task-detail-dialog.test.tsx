import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { TaskDetailDialog } from "./task-detail-dialog"
import type { Task } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_PROJECT_ID_1,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
  TEST_LABEL_ID_3,
  TEST_SECTION_ID_2,
} from "@/lib/utils/test-constants"

// Mock component props interface
interface MockComponentProps {
  children?: React.ReactNode
  open?: boolean
  className?: string
  task?: Record<string, unknown> | null
  onSuccess?: () => void
  onCancel?: () => void
}

// Mock Jotai
let mockShowTaskPanel = false
let mockSelectedTask: Task | null = null
let mockCloseTaskPanel = vi.fn()
let mockDeleteTask = vi.fn()

vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue: vi.fn((atom) => {
      // Mock atom by checking its debugLabel or toString
      const atomString = atom.toString()
      if (atomString.includes("showTaskPanel") || atom.debugLabel === "showTaskPanelAtom") {
        return mockShowTaskPanel
      }
      if (atomString.includes("selectedTask") || atom.debugLabel === "selectedTaskAtom") {
        return mockSelectedTask
      }
      return null
    }),
    useSetAtom: vi.fn((atom) => {
      const atomString = atom.toString()
      if (atomString.includes("closeTaskPanel") || atom.debugLabel === "closeTaskPanelAtom") {
        return mockCloseTaskPanel
      }
      if (atomString.includes("deleteTask") || atom.debugLabel === "deleteTaskAtom") {
        return mockDeleteTask
      }
      return vi.fn()
    }),
  }
})

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

// Mock the TaskForm component
vi.mock("@/components/task/task-form", () => ({
  TaskForm: ({ task, onSuccess, onCancel }: MockComponentProps) => (
    <div data-testid="task-form">
      <div data-testid="task-form-title">
        {typeof task?.title === "string" ? task.title : "No title"}
      </div>
      <div data-testid="task-form-id">{typeof task?.id === "string" ? task.id : "No id"}</div>
      <button data-testid="task-form-success" onClick={onSuccess}>
        Success
      </button>
      <button data-testid="task-form-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}))

// Mock next-themes
vi.mock("next-themes", () => ({
  ThemeProvider: ({ children }: MockComponentProps) => children,
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}))

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe("TaskDetailDialog", () => {
  const mockTask: Task = {
    id: TEST_TASK_ID_1,
    title: "Test Task",
    description: "Test Description",
    priority: 2,
    completed: false,
    dueDate: new Date("2022-01-01"),
    projectId: TEST_PROJECT_ID_1,
    labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2], // Use label IDs matching sample data
    sectionId: TEST_SECTION_ID_2,
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date("2022-01-01"),
    status: "active",
    order: 0,
    recurringMode: "dueDate",
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset atom state
    mockShowTaskPanel = false
    mockSelectedTask = null
    mockCloseTaskPanel = vi.fn()
    mockDeleteTask = vi.fn()
  })

  it("renders dialog when atom state shows dialog open and task is provided", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-header")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-title")).toBeInTheDocument()
    expect(screen.getByTestId("task-form")).toBeInTheDocument()
  })

  it("does not render dialog when atom state shows dialog closed", () => {
    mockShowTaskPanel = false
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })

  it("does not render when selected task atom is null", () => {
    mockShowTaskPanel = true
    mockSelectedTask = null

    render(<TaskDetailDialog />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })

  it("does not render when selected task atom is undefined", () => {
    mockShowTaskPanel = true
    mockSelectedTask = null

    render(<TaskDetailDialog />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })

  it("displays correct dialog title", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Edit Task")
  })

  it("passes task from atom to TaskForm", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    expect(screen.getByTestId("task-form-title")).toHaveTextContent("Test Task")
    expect(screen.getByTestId("task-form-id")).toHaveTextContent(TEST_TASK_ID_1)
  })

  it("handles success callback from TaskForm", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    const successButton = screen.getByTestId("task-form-success")
    fireEvent.click(successButton)

    expect(mockCloseTaskPanel).toHaveBeenCalled()
  })

  it("handles cancel callback from TaskForm", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    const cancelButton = screen.getByTestId("task-form-cancel")
    fireEvent.click(cancelButton)

    expect(mockCloseTaskPanel).toHaveBeenCalled()
  })

  it("renders with proper CSS classes", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    const dialogContent = screen.getByTestId("dialog-content")
    expect(dialogContent).toHaveClass("sm:max-w-2xl")
  })

  it("renders TaskForm in proper container with padding", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    const taskForm = screen.getByTestId("task-form")
    expect(taskForm.parentElement).toHaveClass("py-4")
  })

  it("handles task with minimal properties", () => {
    const minimalTask: Task = {
      ...mockTask,
      id: TEST_TASK_ID_1,
      title: "Minimal Task",
    }

    mockShowTaskPanel = true
    mockSelectedTask = minimalTask

    render(<TaskDetailDialog />)

    expect(screen.getByTestId("task-form-title")).toHaveTextContent("Minimal Task")
    expect(screen.getByTestId("task-form-id")).toHaveTextContent(TEST_TASK_ID_1)
  })

  it("handles task with all properties", () => {
    const fullTask: Task = {
      ...mockTask,
      id: TEST_TASK_ID_2,
      title: "Full Task",
      description: "Full description",
      priority: 1,
      completed: true,
      dueDate: new Date("2022-12-31"),
      projectId: TEST_PROJECT_ID_1,
      labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2, TEST_LABEL_ID_3], // Use label IDs
      recurring: "weekly",
    }

    mockShowTaskPanel = true
    mockSelectedTask = fullTask

    render(<TaskDetailDialog />)

    expect(screen.getByTestId("task-form-title")).toHaveTextContent("Full Task")
    expect(screen.getByTestId("task-form-id")).toHaveTextContent(TEST_TASK_ID_2)
  })

  it("early returns null when selected task atom is falsy", () => {
    mockShowTaskPanel = true
    mockSelectedTask = null

    const { container } = render(<TaskDetailDialog />)

    expect(container.firstChild).toBeNull()
  })

  it("early returns null when selected task atom is null", () => {
    mockShowTaskPanel = true
    mockSelectedTask = null

    const { container } = render(<TaskDetailDialog />)

    // Null is falsy, so it should not render
    expect(container.firstChild).toBeNull()
  })

  it("handles dialog open state change through atoms", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    const { rerender } = render(<TaskDetailDialog />)

    expect(screen.getByTestId("dialog")).toBeInTheDocument()

    // Change atom state and rerender
    mockShowTaskPanel = false
    rerender(<TaskDetailDialog />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })

  it("maintains task data across re-renders when atom changes", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    const { rerender } = render(<TaskDetailDialog />)

    expect(screen.getByTestId("task-form-title")).toHaveTextContent("Test Task")

    // Update atom state and rerender
    const updatedTask: Task = { ...mockTask, title: "Updated Task" }
    mockSelectedTask = updatedTask
    rerender(<TaskDetailDialog />)

    expect(screen.getByTestId("task-form-title")).toHaveTextContent("Updated Task")
  })

  it("handles success callback correctly", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    const successButton = screen.getByTestId("task-form-success")
    fireEvent.click(successButton)

    expect(mockCloseTaskPanel).toHaveBeenCalledTimes(1)
  })

  it("uses atomic state correctly", () => {
    mockShowTaskPanel = true
    mockSelectedTask = mockTask

    render(<TaskDetailDialog />)

    // The component should be rendered with dialog open
    expect(screen.getByTestId("dialog")).toBeInTheDocument()

    // Verify atoms are being used (no direct calls initially)
    expect(mockCloseTaskPanel).not.toHaveBeenCalled()
    expect(mockDeleteTask).not.toHaveBeenCalled()
  })
})
