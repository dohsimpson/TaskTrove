import React from "react"
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { CommentContent } from "./comment-content"
import type { Task, TaskComment, CreateTaskRequest } from "@/lib/types"
import { createTaskId, createCommentId } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_SECTION_ID_1,
  TEST_COMMENT_ID_1,
  TEST_COMMENT_ID_2,
  TEST_COMMENT_ID_3,
} from "@/lib/utils/test-constants"

// Mock atoms
let mockUpdateTask: Mock
let mockUpdateQuickAddTask: Mock
let mockAllTasks: Task[]
let mockNewTask: CreateTaskRequest

// Mock Jotai
vi.mock("jotai", () => ({
  useSetAtom: vi.fn((atom: { toString: () => string }) => {
    if (atom.toString().includes("updateTask")) return mockUpdateTask
    if (atom.toString().includes("updateQuickAddTask")) return mockUpdateQuickAddTask
    return vi.fn()
  }),
  useAtomValue: vi.fn((atom: { toString: () => string }) => {
    if (atom.toString().includes("tasksAtom")) return mockAllTasks
    if (atom.toString().includes("quickAddTaskAtom")) return mockNewTask
    return []
  }),
  atom: vi.fn((value) => ({ init: value, toString: () => "mockAtom" })),
}))

// Mock atoms
vi.mock("@/lib/atoms", () => ({
  updateTaskAtom: { toString: () => "updateTaskAtom" },
  tasksAtom: { toString: () => "tasksAtom" },
}))

vi.mock("@/lib/atoms/ui/dialogs", () => ({
  updateQuickAddTaskAtom: { toString: () => "updateQuickAddTaskAtom" },
  quickAddTaskAtom: { toString: () => "quickAddTaskAtom" },
}))

// Mock component interfaces
interface MockButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: string
  size?: string
  [key: string]: unknown
}

interface MockTextareaProps {
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
  [key: string]: unknown
}

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: MockButtonProps) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({
    value,
    onChange,
    onKeyDown,
    placeholder,
    className,
    ...props
  }: MockTextareaProps) => (
    <textarea
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      data-testid="comment-textarea"
      {...props}
    />
  ),
}))

// Mock utility functions
vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" "),
}))

vi.mock("uuid", () => ({
  v4: () => "550e8400-e29b-41d4-a716-446655440000",
}))

describe("CommentContent", () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: TEST_TASK_ID_1,
    title: "Test Task",
    description: "",
    completed: false,
    priority: 4 as const,
    dueDate: undefined,
    projectId: TEST_PROJECT_ID_1,
    sectionId: TEST_SECTION_ID_1,
    labels: [],
    subtasks: [],
    comments: [],
    attachments: [],
    createdAt: new Date(),
    recurringMode: "dueDate",
    status: "active" as const,
    order: 0,
    favorite: false,
    recurring: undefined,
    ...overrides,
  })

  const createMockComment = (overrides: Partial<TaskComment> = {}): TaskComment => ({
    id: TEST_COMMENT_ID_1,
    content: "Test comment",
    createdAt: new Date("2024-01-01T10:00:00Z"),
    ...overrides,
  })

  const createMockCreateTaskRequest = (
    overrides: Partial<CreateTaskRequest> = {},
  ): CreateTaskRequest => ({
    title: "New Task",
    description: "",
    priority: 4 as const,
    subtasks: [],
    comments: [],
    labels: [],
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Initialize mock variables
    mockUpdateTask = vi.fn()
    mockUpdateQuickAddTask = vi.fn()
    mockAllTasks = []
    mockNewTask = {
      title: "New Task",
      description: "",
      priority: 4,
      subtasks: [],
      comments: [],
      labels: [],
    }
  })

  // Unit tests to ensure hooks are not called conditionally
  describe("React Hooks Usage", () => {
    it("should call all hooks before any early returns", () => {
      // Mock console.warn to catch early return message
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

      // Render with undefined task to trigger early return
      render(<CommentContent taskId="non-existent-task-id" />)

      // The component should handle this gracefully without hook order errors
      expect(consoleSpy).toHaveBeenCalledWith("Task not found", "non-existent-task-id")

      consoleSpy.mockRestore()
    })

    it("should properly initialize all hooks when task exists", () => {
      const task = createMockTask()
      mockAllTasks.push(task)

      render(<CommentContent taskId={task.id} />)

      // Component should render without hook order errors - just check it renders
      expect(screen.getByText("Add comment")).toBeInTheDocument()

      // Cleanup
      mockAllTasks.length = 0
    })

    it("should handle useCallback hook properly", async () => {
      const user = userEvent.setup()
      const onAddingChange = vi.fn()
      const task = createMockTask()

      render(<CommentContent task={task} onAddingChange={onAddingChange} />)

      // Start adding comment to ensure useCallback hook is used
      await user.click(screen.getByText("Add comment"))

      // Should call with true when starting
      expect(onAddingChange).toHaveBeenCalledWith(true)

      // Clear previous calls
      onAddingChange.mockClear()

      // Focus on the textarea and then press Escape to test the useCallback hook
      const textarea = screen.getByTestId("comment-textarea")
      await user.click(textarea)
      await user.keyboard("{Escape}")

      // Should call with false when cancelling (check the last call)
      expect(onAddingChange).toHaveBeenLastCalledWith(false)
    })

    it("should handle useEffect hooks properly without conditional calls", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      // Start adding to trigger useEffect hooks
      await user.click(screen.getByText("Add comment"))

      // Verify component is in adding state (indicating useEffect ran)
      expect(screen.getByTestId("comment-textarea")).toBeInTheDocument()
    })
  })

  describe("Rendering Modes", () => {
    it("renders in inline mode by default", () => {
      const task = createMockTask()
      render(<CommentContent task={task} />)

      expect(screen.queryByText("Comments")).not.toBeInTheDocument()
    })

    it("renders in popover mode when specified", () => {
      const task = createMockTask()
      render(<CommentContent task={task} mode="popover" />)

      expect(screen.getByText("Add Comment")).toBeInTheDocument()
    })

    it("applies custom className", () => {
      const task = createMockTask()
      const { container } = render(<CommentContent task={task} className="custom-class" />)

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  describe("Comments Display", () => {
    it("shows last 3 comments in inline mode", () => {
      const comments = [
        createMockComment({ id: TEST_COMMENT_ID_1, content: "Comment 1" }),
        createMockComment({ id: TEST_COMMENT_ID_2, content: "Comment 2" }),
        createMockComment({ id: TEST_COMMENT_ID_3, content: "Comment 3" }),
        createMockComment({
          id: createCommentId("550e8400-e29b-41d4-a716-446655440004"),
          content: "Comment 4",
        }),
        createMockComment({
          id: createCommentId("550e8400-e29b-41d4-a716-446655440005"),
          content: "Comment 5",
        }),
      ]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} mode="inline" />)

      // Should show last 3 comments (3, 4, 5) in reverse order (5, 4, 3)
      expect(screen.getByText("Comment 5")).toBeInTheDocument()
      expect(screen.getByText("Comment 4")).toBeInTheDocument()
      expect(screen.getByText("Comment 3")).toBeInTheDocument()
      expect(screen.queryByText("Comment 1")).not.toBeInTheDocument()
      expect(screen.queryByText("Comment 2")).not.toBeInTheDocument()
    })

    it("shows all comments in popover mode", () => {
      const comments = [
        createMockComment({ id: TEST_COMMENT_ID_1, content: "Comment 1" }),
        createMockComment({ id: TEST_COMMENT_ID_2, content: "Comment 2" }),
        createMockComment({ id: TEST_COMMENT_ID_3, content: "Comment 3" }),
      ]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} mode="popover" />)

      expect(screen.getByText("Comment 1")).toBeInTheDocument()
      expect(screen.getByText("Comment 2")).toBeInTheDocument()
      expect(screen.getByText("Comment 3")).toBeInTheDocument()
    })

    it("shows view all link when more than 3 comments in inline mode", () => {
      const comments = [
        createMockComment({
          id: createCommentId("550e8400-e29b-41d4-a716-446655440001"),
          content: "Comment 1",
        }),
        createMockComment({
          id: createCommentId("550e8400-e29b-41d4-a716-446655440002"),
          content: "Comment 2",
        }),
        createMockComment({
          id: createCommentId("550e8400-e29b-41d4-a716-446655440003"),
          content: "Comment 3",
        }),
        createMockComment({
          id: createCommentId("550e8400-e29b-41d4-a716-446655440004"),
          content: "Comment 4",
        }),
        createMockComment({
          id: createCommentId("550e8400-e29b-41d4-a716-446655440005"),
          content: "Comment 5",
        }),
      ]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} mode="inline" onViewAll={vi.fn()} />)

      expect(screen.getByText("View all")).toBeInTheDocument()
    })

    it("displays add comment button when no comments", () => {
      const task = createMockTask({ comments: [] })

      render(<CommentContent task={task} />)

      expect(screen.getByText("Add comment")).toBeInTheDocument()
    })
  })

  // Tests for quick-add mode support
  describe("Quick-add Mode Support", () => {
    it("should work with CreateTaskRequest in quick-add mode", () => {
      const createTaskRequest = createMockCreateTaskRequest({
        comments: [createMockComment({ content: "Quick-add comment" })],
      })

      // Update the mock for this test
      mockNewTask = createTaskRequest

      render(<CommentContent />)

      expect(screen.getByText("Quick-add comment")).toBeInTheDocument()
    })

    it("should update quickAddTaskAtom when adding comment in new task mode", async () => {
      const user = userEvent.setup()
      const createTaskRequest = createMockCreateTaskRequest({ comments: [] })

      // Update the mock for this test
      mockNewTask = createTaskRequest
      mockAllTasks = []

      render(<CommentContent />)

      await user.click(screen.getByText("Add comment"))
      await user.type(screen.getByTestId("comment-textarea"), "New comment")
      await user.click(screen.getByRole("button", { name: "Add" }))

      expect(mockUpdateQuickAddTask).toHaveBeenCalledWith({
        updateRequest: {
          comments: [
            {
              id: expect.any(String),
              content: "New comment",
              createdAt: expect.any(Date),
            },
          ],
        },
      })
    })

    it("should update existing task when taskId is provided", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ comments: [] })
      mockAllTasks.push(task)

      render(<CommentContent taskId={task.id} />)

      await user.click(screen.getByText("Add comment"))
      await user.type(screen.getByTestId("comment-textarea"), "New comment")
      await user.click(screen.getByRole("button", { name: "Add" }))

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: createTaskId(task.id),
          comments: [
            {
              id: expect.any(String),
              content: "New comment",
              createdAt: expect.any(Date),
            },
          ],
        },
      })

      // Cleanup
      mockAllTasks.length = 0
    })
  })

  describe("Adding Comments", () => {
    it("shows add comment interface when clicking add button", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      await user.click(screen.getByText("Add comment"))

      expect(screen.getByTestId("comment-textarea")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Add your comment...")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument()
    })

    it("calls onAddingChange when starting to add", async () => {
      const user = userEvent.setup()
      const onAddingChange = vi.fn()
      const task = createMockTask()

      render(<CommentContent task={task} onAddingChange={onAddingChange} />)

      await user.click(screen.getByText("Add comment"))

      expect(onAddingChange).toHaveBeenCalledWith(true)
    })

    it("adds comment when Add button is clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      await user.click(screen.getByText("Add comment"))
      await user.type(screen.getByTestId("comment-textarea"), "New comment")
      await user.click(screen.getByRole("button", { name: "Add" }))

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: task.id,
          comments: [
            {
              id: expect.any(String),
              content: "New comment",
              createdAt: expect.any(Date),
            },
          ],
        },
      })
    })

    it("adds comment when Cmd+Enter is pressed", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      await user.click(screen.getByText("Add comment"))
      await user.type(screen.getByTestId("comment-textarea"), "New comment")
      await user.keyboard("{Meta>}{Enter}{/Meta}")

      expect(mockUpdateTask).toHaveBeenCalled()
    })

    it("cancels adding when Cancel button is clicked", async () => {
      const user = userEvent.setup()
      const onAddingChange = vi.fn()
      const task = createMockTask()

      render(<CommentContent task={task} onAddingChange={onAddingChange} />)

      await user.click(screen.getByText("Add comment"))
      await user.type(screen.getByTestId("comment-textarea"), "Some text")
      await user.click(screen.getByRole("button", { name: "Cancel" }))

      expect(screen.queryByTestId("comment-textarea")).not.toBeInTheDocument()
      expect(onAddingChange).toHaveBeenCalledWith(false)
    })

    it("cancels adding when Escape key is pressed", async () => {
      const user = userEvent.setup()
      const onAddingChange = vi.fn()
      const task = createMockTask()

      render(<CommentContent task={task} onAddingChange={onAddingChange} />)

      await user.click(screen.getByText("Add comment"))
      await user.type(screen.getByTestId("comment-textarea"), "Some text")
      await user.keyboard("{Escape}")

      expect(screen.queryByTestId("comment-textarea")).not.toBeInTheDocument()
      expect(onAddingChange).toHaveBeenCalledWith(false)
    })

    it("does not add empty comment", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      await user.click(screen.getByText("Add comment"))
      await user.click(screen.getByRole("button", { name: "Add" }))

      expect(mockUpdateTask).not.toHaveBeenCalled()
    })

    it("trims whitespace from comment content", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      await user.click(screen.getByText("Add comment"))
      await user.type(screen.getByTestId("comment-textarea"), "  New comment  ")
      await user.click(screen.getByRole("button", { name: "Add" }))

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: task.id,
          comments: [
            {
              id: expect.any(String),
              content: "New comment",
              createdAt: expect.any(Date),
            },
          ],
        },
      })
    })

    it("clears input and hides form after successful add", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      await user.click(screen.getByText("Add comment"))
      await user.type(screen.getByTestId("comment-textarea"), "New comment")
      await user.click(screen.getByRole("button", { name: "Add" }))

      expect(screen.queryByTestId("comment-textarea")).not.toBeInTheDocument()
      expect(screen.getByText("Add comment")).toBeInTheDocument()
    })
  })

  describe("Legacy Props Support", () => {
    it("uses legacy task prop when provided", () => {
      const task = createMockTask({
        comments: [createMockComment({ content: "Legacy comment" })],
      })

      render(<CommentContent task={task} />)

      expect(screen.getByText("Legacy comment")).toBeInTheDocument()
    })

    it("calls onAddComment callback when provided", async () => {
      const user = userEvent.setup()
      const onAddComment = vi.fn()
      const task = createMockTask()

      render(<CommentContent task={task} onAddComment={onAddComment} />)

      await user.click(screen.getByText("Add comment"))
      await user.type(screen.getByTestId("comment-textarea"), "Callback comment")
      await user.click(screen.getByRole("button", { name: "Add" }))

      expect(onAddComment).toHaveBeenCalledWith("Callback comment")
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })
  })
})
