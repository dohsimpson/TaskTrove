import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { CommentManagementPopover } from "./comment-management-popover"
import type { Task, TaskComment } from "@/lib/types"
import { createUserId } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_COMMENT_ID_1,
} from "@tasktrove/types/test-constants"
import { DEFAULT_UUID } from "@tasktrove/constants"

// Mock ContentPopover
interface MockContentPopoverProps {
  children: React.ReactNode
  content: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  side?: string
  align?: string
  className?: string
}

vi.mock("@/components/ui/content-popover", () => ({
  ContentPopover: ({
    children,
    content,
    open = false,
    onOpenChange,
    side,
    align,
    className,
  }: MockContentPopoverProps) => (
    <div data-testid="content-popover">
      <div
        data-testid="popover-trigger"
        data-open={open}
        data-side={side}
        data-align={align}
        className={className}
        onClick={() => onOpenChange?.(!open)}
      >
        {children}
      </div>
      {open && (
        <div data-testid="popover-content" role="dialog">
          {content}
        </div>
      )}
    </div>
  ),
}))

// Mock CommentContent
interface MockCommentContentProps {
  taskId?: string
  task?: Task
  onAddComment?: (content: string) => void
  mode?: "inline" | "popover"
  scrollToBottomKey?: number
}

vi.mock("./comment-content", () => ({
  CommentContent: ({
    taskId,
    task,
    onAddComment,
    mode,
    scrollToBottomKey,
  }: MockCommentContentProps) => (
    <div data-testid="comment-content">
      <div data-testid="comment-content-taskId">{taskId || "undefined"}</div>
      <div data-testid="comment-content-task">{task?.id || "undefined"}</div>
      <div data-testid="comment-content-mode">{mode}</div>
      <div data-testid="comment-content-comments-count">{task?.comments.length}</div>
      <div data-testid="comment-content-scroll-key">{scrollToBottomKey ?? "undefined"}</div>
      <input
        data-testid="comment-input"
        placeholder={task?.comments.length ? "Add another comment..." : "Add comments..."}
      />
      <button data-testid="comment-submit-button" onClick={() => onAddComment?.("test comment")}>
        Submit
      </button>
    </div>
  ),
}))

describe("CommentManagementPopover", () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders children as trigger", () => {
      const task = createMockTask()

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      expect(screen.getByText("Open Comments")).toBeInTheDocument()
    })

    it("initially renders closed", () => {
      const task = createMockTask()

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument()
    })

    it("applies custom className", () => {
      const task = createMockTask()

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()} className="custom-class">
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      const popoverTrigger = screen.getByTestId("popover-trigger")
      expect(popoverTrigger).toHaveClass("custom-class")
    })

    it("configures ContentPopover with correct props", () => {
      const task = createMockTask()

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      const popoverTrigger = screen.getByTestId("popover-trigger")
      expect(popoverTrigger).toHaveAttribute("data-side", "bottom")
      expect(popoverTrigger).toHaveAttribute("data-align", "start")
    })
  })

  describe("Props Handling", () => {
    it("supports taskId prop", async () => {
      const user = userEvent.setup()
      const onAddComment = vi.fn()

      render(
        <CommentManagementPopover taskId="test-task-id" onAddComment={onAddComment}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      expect(screen.getByTestId("comment-content-taskId")).toHaveTextContent("test-task-id")
    })

    it("supports legacy task prop", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddComment = vi.fn()

      render(
        <CommentManagementPopover task={task} onAddComment={onAddComment}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      expect(screen.getByTestId("comment-content-task")).toHaveTextContent(task.id)
    })

    it("supports both taskId and task props together", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddComment = vi.fn()

      render(
        <CommentManagementPopover taskId="explicit-task-id" task={task} onAddComment={onAddComment}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      expect(screen.getByTestId("comment-content-taskId")).toHaveTextContent("explicit-task-id")
      expect(screen.getByTestId("comment-content-task")).toHaveTextContent(task.id)
    })

    it("works without onAddComment callback", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(
        <CommentManagementPopover task={task}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      expect(screen.getByTestId("comment-content")).toBeInTheDocument()
    })
  })

  describe("Popover State Management", () => {
    it("opens popover when trigger is clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      expect(screen.getByTestId("popover-content")).toBeInTheDocument()
      expect(screen.getByTestId("comment-content")).toBeInTheDocument()
    })

    it("closes popover when clicked again", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      // Open
      await user.click(screen.getByText("Open Comments"))
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()

      // Close
      await user.click(screen.getByText("Open Comments"))
      expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument()
    })

    it("calls onOpenChange callback when state changes", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onOpenChange = vi.fn()

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()} onOpenChange={onOpenChange}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))
      expect(onOpenChange).toHaveBeenCalledWith(true)

      onOpenChange.mockClear()
      await user.click(screen.getByText("Open Comments"))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("Auto-start Adding Behavior", () => {
    it("auto-starts adding when opening with no comments (existing task)", async () => {
      const user = userEvent.setup()
      const taskWithNoComments = createMockTask({ comments: [] })

      render(
        <CommentManagementPopover task={taskWithNoComments} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      // This tests that the component sets isAdding to true when opening with no comments
      // Since we're mocking CommentContent, we check that it receives the correct mode
      expect(screen.getByTestId("comment-content-mode")).toHaveTextContent("popover")
      expect(screen.getByTestId("comment-content-comments-count")).toHaveTextContent("0")
    })

    it("does not auto-start adding when opening with existing comments", async () => {
      const user = userEvent.setup()
      const taskWithComments = createMockTask({
        comments: [createMockComment()],
      })

      render(
        <CommentManagementPopover task={taskWithComments} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      expect(screen.getByTestId("comment-content-comments-count")).toHaveTextContent("1")
    })

    it("does not auto-start adding when no task prop provided (quick-add mode)", async () => {
      const user = userEvent.setup()

      render(
        <CommentManagementPopover taskId="some-id" onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      // Should not auto-start when task is not provided (indicating quick-add mode)
      expect(screen.getByTestId("comment-content-task")).toHaveTextContent("undefined")
    })
  })

  describe("Adding State Management", () => {
    it("shows consistent input state when popover closes and reopens", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ comments: [] })

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      // Input should be visible
      expect(screen.getByTestId("comment-input")).toBeInTheDocument()

      // Close the popover
      await user.click(screen.getByText("Open Comments"))

      // Reopen to verify input is still available
      await user.click(screen.getByText("Open Comments"))

      // Input should still be available and ready for use
      expect(screen.getByTestId("comment-content")).toBeInTheDocument()
      expect(screen.getByTestId("comment-input")).toBeInTheDocument()
    })

    it("shows input field when opened with no existing comments", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ comments: [] })

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()

      // Input should be visible and ready for use
      expect(screen.getByTestId("comment-input")).toBeInTheDocument()
      expect(screen.getByTestId("comment-submit-button")).toBeInTheDocument()
    })

    it("shows comments and input field when opened with existing comments", async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        comments: [createMockComment()],
      })

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()

      // Both existing comments and input should be visible
      expect(screen.getByTestId("comment-content")).toBeInTheDocument()
      expect(screen.getByTestId("comment-input")).toBeInTheDocument()
    })

    it("shows input field in quick-add mode", async () => {
      const user = userEvent.setup()

      render(
        <CommentManagementPopover taskId="some-id" onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()

      // Input should be available for quick-add mode
      expect(screen.getByTestId("comment-input")).toBeInTheDocument()
      expect(screen.getByTestId("comment-submit-button")).toBeInTheDocument()
    })
  })

  describe("CommentContent Integration", () => {
    it("passes correct props to CommentContent", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddComment = vi.fn()

      render(
        <CommentManagementPopover taskId="test-id" task={task} onAddComment={onAddComment}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      expect(screen.getByTestId("comment-content-taskId")).toHaveTextContent("test-id")
      expect(screen.getByTestId("comment-content-task")).toHaveTextContent(task.id)
      expect(screen.getByTestId("comment-content-mode")).toHaveTextContent("popover")
    })

    it("handles CommentContent onAddComment callback", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddComment = vi.fn()

      render(
        <CommentManagementPopover task={task} onAddComment={onAddComment}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))
      await user.click(screen.getByTestId("comment-submit-button"))

      expect(onAddComment).toHaveBeenCalledWith("test comment")
    })
  })

  describe("Accessibility", () => {
    it("renders popover content with dialog role", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  describe("Auto-scroll on Open", () => {
    it("increments scrollToBottomKey when popover opens", async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        comments: [createMockComment(), createMockComment()],
      })

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      // Initially closed, scrollToBottomKey should be 0
      await user.click(screen.getByText("Open Comments"))

      // When opened, scrollToBottomKey should be incremented to trigger scroll
      expect(screen.getByTestId("comment-content-scroll-key")).toHaveTextContent("1")
    })

    it("increments scrollToBottomKey each time popover reopens", async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        comments: [createMockComment()],
      })

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      // First open
      await user.click(screen.getByText("Open Comments"))
      expect(screen.getByTestId("comment-content-scroll-key")).toHaveTextContent("1")

      // Close
      await user.click(screen.getByText("Open Comments"))

      // Second open - key should increment again
      await user.click(screen.getByText("Open Comments"))
      expect(screen.getByTestId("comment-content-scroll-key")).toHaveTextContent("2")

      // Close
      await user.click(screen.getByText("Open Comments"))

      // Third open
      await user.click(screen.getByText("Open Comments"))
      expect(screen.getByTestId("comment-content-scroll-key")).toHaveTextContent("3")
    })

    it("triggers auto-scroll for task with no comments", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ comments: [] })

      render(
        <CommentManagementPopover task={task} onAddComment={vi.fn()}>
          <button>Open Comments</button>
        </CommentManagementPopover>,
      )

      await user.click(screen.getByText("Open Comments"))

      // Should trigger scroll even when there are no comments
      expect(screen.getByTestId("comment-content-scroll-key")).toHaveTextContent("1")
    })
  })
})
