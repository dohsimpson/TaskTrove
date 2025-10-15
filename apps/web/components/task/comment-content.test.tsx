import React from "react"
import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { CommentContent } from "./comment-content"
import type { Task, TaskComment, CreateTaskRequest } from "@/lib/types"
import { createTaskId, createCommentId, createUserId } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_COMMENT_ID_1,
  TEST_COMMENT_ID_2,
  TEST_COMMENT_ID_3,
} from "@tasktrove/types/test-constants"
import { DEFAULT_UUID } from "@tasktrove/constants"

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
    if (atom.toString().includes("userAtom"))
      return {
        id: createUserId(DEFAULT_UUID),
        username: "testuser",
        password: "testpassword",
      }
    return []
  }),
  atom: vi.fn((value) => ({ init: value, toString: () => "mockAtom" })),
  Provider: vi.fn(({ children }) => children),
}))

vi.mock("@tasktrove/atoms", () => ({
  updateQuickAddTaskAtom: { toString: () => "updateQuickAddTaskAtom" },
  quickAddTaskAtom: { toString: () => "quickAddTaskAtom" },
  tasksAtom: { toString: () => "tasksAtom" },
  updateTaskAtom: { toString: () => "updateTaskAtom" },
  userAtom: { toString: () => "userAtom" },
  taskAtoms: {
    actions: {},
    derived: {},
  },
  projectAtoms: {
    actions: {},
    derived: {},
  },
  labelsAtom: { toString: () => "labelsAtom" },
  updateLabelAtom: { toString: () => "updateLabelAtom" },
  deleteLabelAtom: { toString: () => "deleteLabelAtom" },
  toggleTaskSelectionAtom: { toString: () => "toggleTaskSelectionAtom" },
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

interface MockInputProps {
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
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

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, onKeyDown, placeholder, className, ...props }: MockInputProps) => (
    <input
      type="text"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      data-testid="comment-input"
      {...props}
    />
  ),
}))

// Mock tooltip components
vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({
    children,
    delayDuration,
    ...props
  }: {
    children: React.ReactNode
    delayDuration?: number
  }) => (
    <div data-testid="tooltip-provider" data-delay-duration={delayDuration} {...props}>
      {children}
    </div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip">{children}</div>
  ),
  TooltipTrigger: ({ children, ...props }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger" {...props}>
      {children}
    </div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  ),
}))

// Mock EditableDiv component
vi.mock("@/components/ui/custom/editable-div", () => ({
  EditableDiv: ({
    value,
    onChange,
    onCancel,
    multiline,
    cursorPosition,
    allowEmpty,
    autoFocus,
    onEditingChange,
    placeholder,
    ...domProps
  }: {
    value: string
    onChange: (value: string) => void
    onCancel?: () => void
    multiline?: boolean
    cursorPosition?: "start" | "end"
    allowEmpty?: boolean
    autoFocus?: boolean
    onEditingChange?: (isEditing: boolean) => void
    placeholder?: string
    [key: string]: unknown
  }) => {
    // Component-specific props are extracted but not used in the mock
    void multiline
    void cursorPosition
    void allowEmpty
    void autoFocus
    void onEditingChange
    void placeholder

    const [localValue, setLocalValue] = React.useState(value)

    return (
      <div data-testid="editable-div" {...domProps}>
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => onChange(localValue)}
          data-testid="editable-div-input"
        />
        <button onClick={onCancel} data-testid="editable-div-cancel">
          Cancel
        </button>
      </div>
    )
  },
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
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date(),
    recurringMode: "dueDate",
    recurring: undefined,
    ...overrides,
  })

  const createMockComment = (overrides: Partial<TaskComment> = {}): TaskComment => ({
    id: TEST_COMMENT_ID_1,
    userId: createUserId(DEFAULT_UUID),
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
      expect(screen.getByTestId("comment-input")).toBeInTheDocument()

      // Cleanup
      mockAllTasks.length = 0
    })

    it("should handle useCallback hook properly", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      // Input should always be visible
      const input = screen.getByTestId("comment-input")
      expect(input).toBeInTheDocument()

      // Should be able to type in the input (tests useCallback for onChange)
      await user.type(input, "Test comment")
      expect(input).toHaveValue("Test comment")
    })

    it("should handle useEffect hooks properly without conditional calls", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      // Input should always be visible (no conditional rendering)
      expect(screen.getByTestId("comment-input")).toBeInTheDocument()

      // Should be able to interact with input
      const input = screen.getByTestId("comment-input")
      await user.type(input, "Testing useEffect")
      expect(input).toHaveValue("Testing useEffect")
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
    it("shows all comments in scrollable container in inline mode", () => {
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

      // Should show all comments in chronological order (1, 2, 3, 4, 5)
      expect(screen.getByText("Comment 1")).toBeInTheDocument()
      expect(screen.getByText("Comment 2")).toBeInTheDocument()
      expect(screen.getByText("Comment 3")).toBeInTheDocument()
      expect(screen.getByText("Comment 4")).toBeInTheDocument()
      expect(screen.getByText("Comment 5")).toBeInTheDocument()
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

    it("shows all comments without view all button in inline mode", () => {
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

      // All comments should be visible
      expect(screen.getByText("Comment 1")).toBeInTheDocument()
      expect(screen.getByText("Comment 2")).toBeInTheDocument()
      expect(screen.getByText("Comment 3")).toBeInTheDocument()
      expect(screen.getByText("Comment 4")).toBeInTheDocument()
      expect(screen.getByText("Comment 5")).toBeInTheDocument()
      // No view all button should be present
      expect(screen.queryByText("View all")).not.toBeInTheDocument()
    })

    it("displays add comment button when no comments", () => {
      const task = createMockTask({ comments: [] })

      render(<CommentContent task={task} />)

      expect(screen.getByTestId("comment-input")).toBeInTheDocument()
    })

    it("shows tooltip with absolute timestamp when hovering over relative timestamp", () => {
      const specificDate = new Date("2024-01-15T14:30:00Z")
      const comment = createMockComment({
        content: "Test comment",
        createdAt: specificDate,
      })
      const task = createMockTask({ comments: [comment] })

      render(<CommentContent task={task} />)

      // Should render tooltip components
      expect(screen.getByTestId("tooltip-provider")).toBeInTheDocument()
      expect(screen.getByTestId("tooltip")).toBeInTheDocument()
      expect(screen.getByTestId("tooltip-trigger")).toBeInTheDocument()
      expect(screen.getByTestId("tooltip-content")).toBeInTheDocument()

      // Should show relative time in the trigger
      expect(screen.getByText(/ago/)).toBeInTheDocument()

      // Should show absolute timestamp in tooltip content (formatted with PPpp)
      // PPpp format example: "Jan 15, 2024, 9:30:00 AM" (converted from UTC to local timezone)
      expect(screen.getByTestId("tooltip-content")).toHaveTextContent(/Jan 15, 2024,.*AM|PM/)
    })

    it("applies pointer cursor to timestamp hover area", () => {
      const comment = createMockComment({ content: "Test comment" })
      const task = createMockTask({ comments: [comment] })

      const { container } = render(<CommentContent task={task} />)

      // Find the span with timestamp that should have cursor-pointer class
      const timestampElement = container.querySelector(".cursor-pointer")
      expect(timestampElement).toBeInTheDocument()
      expect(timestampElement).toHaveClass("cursor-pointer")
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

      const input = screen.getByTestId("comment-input")
      await user.type(input, "New comment")
      await user.keyboard("{Enter}")

      expect(mockUpdateQuickAddTask).toHaveBeenCalledWith({
        updateRequest: {
          comments: [
            {
              id: expect.any(String),
              userId: expect.any(String),
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

      const input = screen.getByTestId("comment-input")
      await user.type(input, "New comment")
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: createTaskId(task.id),
          comments: [
            {
              id: expect.any(String),
              userId: expect.any(String),
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
    it("shows add comment interface always", async () => {
      const task = createMockTask()

      render(<CommentContent task={task} />)

      expect(screen.getByTestId("comment-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Add comments...")).toBeInTheDocument()
      expect(screen.getByTestId("comment-submit-button")).toBeInTheDocument()
    })

    it("submit button is disabled when input is empty", async () => {
      const task = createMockTask()

      render(<CommentContent task={task} />)

      const submitButton = screen.getByTestId("comment-submit-button")
      expect(submitButton).toBeDisabled()
    })

    it("submit button is enabled when input has text", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      const input = screen.getByTestId("comment-input")
      const submitButton = screen.getByTestId("comment-submit-button")

      await user.type(input, "Test comment")
      expect(submitButton).not.toBeDisabled()
    })

    it("adds comment when submit button is clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      const input = screen.getByTestId("comment-input")
      const submitButton = screen.getByTestId("comment-submit-button")

      await user.type(input, "New comment via button")
      await user.click(submitButton)

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: task.id,
          comments: [
            {
              id: expect.any(String),
              userId: expect.any(String),
              content: "New comment via button",
              createdAt: expect.any(Date),
            },
          ],
        },
      })
    })

    it("adds comment when Add button is clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      const input = screen.getByTestId("comment-input")
      await user.type(input, "New comment")
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: task.id,
          comments: [
            {
              id: expect.any(String),
              userId: expect.any(String),
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

      await user.type(screen.getByTestId("comment-input"), "New comment")
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).toHaveBeenCalled()
    })

    it("does not add empty comment", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      // Try to submit empty input with Enter key
      const input = screen.getByTestId("comment-input")
      await user.click(input)
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).not.toHaveBeenCalled()
    })

    it("trims whitespace from comment content", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      const input = screen.getByTestId("comment-input")
      await user.type(input, "  New comment  ")
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: task.id,
          comments: [
            {
              id: expect.any(String),
              userId: expect.any(String),
              content: "New comment",
              createdAt: expect.any(Date),
            },
          ],
        },
      })
    })

    it("clears input after successful add but keeps it visible", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<CommentContent task={task} />)

      const input = screen.getByTestId("comment-input")
      await user.type(input, "New comment")
      await user.keyboard("{Enter}")

      // Input should still be visible but cleared
      expect(screen.getByTestId("comment-input")).toBeInTheDocument()
      expect(input).toHaveValue("")
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

      await user.type(screen.getByTestId("comment-input"), "Callback comment")
      await user.keyboard("{Enter}")

      expect(onAddComment).toHaveBeenCalledWith("Callback comment")
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })
  })

  describe("Comment Deletion", () => {
    it("renders delete buttons for each comment", () => {
      const commentId1 = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const commentId2 = createCommentId("550e8400-e29b-41d4-a716-446655440011")
      const comments = [
        createMockComment({ id: commentId1, content: "First comment" }),
        createMockComment({ id: commentId2, content: "Second comment" }),
      ]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} />)

      expect(screen.getByTestId(`comment-delete-button-${commentId1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`comment-delete-button-${commentId2}`)).toBeInTheDocument()
    })

    it("deletes comment when delete button is clicked", async () => {
      const user = userEvent.setup()
      const commentId1 = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const commentId2 = createCommentId("550e8400-e29b-41d4-a716-446655440011")
      const comments = [
        createMockComment({ id: commentId1, content: "First comment" }),
        createMockComment({ id: commentId2, content: "Second comment" }),
      ]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} />)

      const deleteButton = screen.getByTestId(`comment-delete-button-${commentId1}`)
      await user.click(deleteButton)

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: task.id,
          comments: [comments[1]], // Only second comment should remain
        },
      })
    })

    it("handles deleting comment from quick-add task", async () => {
      const user = userEvent.setup()
      const commentId = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const comments = [createMockComment({ id: commentId, content: "First comment" })]
      const createTaskRequest = createMockCreateTaskRequest({ comments })

      // Update the mock for quick-add mode
      mockNewTask = createTaskRequest
      mockAllTasks = []

      render(<CommentContent />)

      const deleteButton = screen.getByTestId(`comment-delete-button-${commentId}`)
      await user.click(deleteButton)

      expect(mockUpdateQuickAddTask).toHaveBeenCalledWith({
        updateRequest: {
          comments: [], // Comment should be removed
        },
      })
    })

    it("handles deleting comment from legacy task prop", async () => {
      const user = userEvent.setup()
      const commentId = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const comments = [createMockComment({ id: commentId, content: "Legacy comment" })]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} />)

      const deleteButton = screen.getByTestId(`comment-delete-button-${commentId}`)
      await user.click(deleteButton)

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: task.id,
          comments: [], // Comment should be removed
        },
      })
    })

    it("removes comment from display after deletion", async () => {
      const commentId1 = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const commentId2 = createCommentId("550e8400-e29b-41d4-a716-446655440011")
      const comments = [
        createMockComment({ id: commentId1, content: "First comment" }),
        createMockComment({ id: commentId2, content: "Second comment" }),
      ]
      const task = createMockTask({ comments })

      const { rerender } = render(<CommentContent task={task} />)

      // Both comments should be visible initially
      expect(screen.getByText("First comment")).toBeInTheDocument()
      expect(screen.getByText("Second comment")).toBeInTheDocument()

      // Simulate deletion by updating task prop
      const secondComment = comments[1]
      if (!secondComment) {
        throw new Error("Expected to have a second comment in test data")
      }
      const updatedTask = { ...task, comments: [secondComment] }
      rerender(<CommentContent task={updatedTask} />)

      // Only second comment should remain
      expect(screen.queryByText("First comment")).not.toBeInTheDocument()
      expect(screen.getByText("Second comment")).toBeInTheDocument()
    })
  })

  describe("Comment Editing", () => {
    it("renders edit button for each comment", () => {
      const commentId1 = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const commentId2 = createCommentId("550e8400-e29b-41d4-a716-446655440011")
      const comments = [
        createMockComment({ id: commentId1, content: "First comment" }),
        createMockComment({ id: commentId2, content: "Second comment" }),
      ]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} />)

      expect(screen.getByTestId(`comment-edit-button-${commentId1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`comment-edit-button-${commentId2}`)).toBeInTheDocument()
    })

    it("shows EditableDiv when edit button is clicked", async () => {
      const user = userEvent.setup()
      const commentId = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const comments = [createMockComment({ id: commentId, content: "Original comment" })]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} />)

      const editButton = screen.getByTestId(`comment-edit-button-${commentId}`)
      await user.click(editButton)

      expect(screen.getByTestId("editable-div")).toBeInTheDocument()
      expect(screen.getByTestId("editable-div-input")).toHaveValue("Original comment")
    })

    it("updates comment when edited content is saved", async () => {
      const user = userEvent.setup()
      const commentId = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const comments = [createMockComment({ id: commentId, content: "Original comment" })]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} />)

      const editButton = screen.getByTestId(`comment-edit-button-${commentId}`)
      await user.click(editButton)

      const input = screen.getByTestId("editable-div-input")
      await user.clear(input)
      await user.type(input, "Updated comment")

      // Trigger onChange by changing the input value
      await user.click(document.body) // blur triggers save

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: task.id,
          comments: [{ ...comments[0], content: "Updated comment" }],
        },
      })
    })

    it("handles editing comment from quick-add task", async () => {
      const user = userEvent.setup()
      const commentId = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const comments = [createMockComment({ id: commentId, content: "Original comment" })]
      const createTaskRequest = createMockCreateTaskRequest({ comments })

      mockNewTask = createTaskRequest
      mockAllTasks = []

      render(<CommentContent />)

      const editButton = screen.getByTestId(`comment-edit-button-${commentId}`)
      await user.click(editButton)

      const input = screen.getByTestId("editable-div-input")
      await user.clear(input)
      await user.type(input, "Updated comment")
      await user.click(document.body)

      expect(mockUpdateQuickAddTask).toHaveBeenCalledWith({
        updateRequest: {
          comments: [{ ...comments[0], content: "Updated comment" }],
        },
      })
    })

    it("does not update comment if content is unchanged", async () => {
      const user = userEvent.setup()
      const commentId = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const comments = [createMockComment({ id: commentId, content: "Same comment" })]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} />)

      const editButton = screen.getByTestId(`comment-edit-button-${commentId}`)
      await user.click(editButton)

      // Don't change the content, just blur
      await user.click(document.body)

      // Should not call updateTask if content is the same
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })

    it("cancels editing when cancel is triggered", async () => {
      const user = userEvent.setup()
      const commentId = createCommentId("550e8400-e29b-41d4-a716-446655440010")
      const comments = [createMockComment({ id: commentId, content: "Original comment" })]
      const task = createMockTask({ comments })

      render(<CommentContent task={task} />)

      const editButton = screen.getByTestId(`comment-edit-button-${commentId}`)
      await user.click(editButton)

      expect(screen.getByTestId("editable-div")).toBeInTheDocument()

      const cancelButton = screen.getByTestId("editable-div-cancel")
      await user.click(cancelButton)

      // Should not update the task
      expect(mockUpdateTask).not.toHaveBeenCalled()
      // EditableDiv should be gone (component exits edit mode)
      expect(screen.queryByTestId("editable-div")).not.toBeInTheDocument()
      // Original text should be displayed again
      expect(screen.getByText("Original comment")).toBeInTheDocument()
    })
  })
})
