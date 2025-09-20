import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { LabelManagementPopover } from "./label-management-popover"
import type { Task, LabelId } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_SECTION_ID_1,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
} from "@/lib/utils/test-constants"

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
        <div>{children}</div>
      </div>
      {open && (
        <div data-testid="popover-content" role="dialog">
          {content}
        </div>
      )}
    </div>
  ),
}))

// Mock LabelContent
interface MockLabelContentProps {
  taskId?: string
  task?: Partial<Task>
  onAddLabel: (labelName?: string) => void
  onRemoveLabel: (labelId: LabelId) => void
  mode?: "inline" | "popover"
  onAddingChange?: (isAdding: boolean) => void
  initialIsAdding?: boolean
}

vi.mock("./label-content", () => ({
  LabelContent: ({
    taskId,
    task,
    onAddLabel,
    onRemoveLabel,
    mode,
    onAddingChange,
    initialIsAdding,
  }: MockLabelContentProps) => (
    <div data-testid="label-content">
      <div data-testid="label-content-taskId">{taskId || "undefined"}</div>
      <div data-testid="label-content-task">{task?.id || "undefined"}</div>
      <div data-testid="label-content-mode">{mode}</div>
      <div data-testid="label-content-labels-count">{task?.labels?.length ?? 0}</div>
      <div data-testid="label-content-initial-adding">{String(initialIsAdding)}</div>
      <button onClick={() => onAddLabel("test label")}>Mock Add Label</button>
      <button onClick={() => onRemoveLabel(TEST_LABEL_ID_1)}>Mock Remove Label</button>
      <button onClick={() => onAddingChange?.(true)}>Mock Start Adding</button>
      <button onClick={() => onAddingChange?.(false)}>Mock Stop Adding</button>
    </div>
  ),
}))

describe("LabelManagementPopover", () => {
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

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders children as trigger", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      expect(screen.getByText("Open Labels")).toBeInTheDocument()
    })

    it("initially renders closed", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument()
    })

    it("applies custom className to container div", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          className="custom-class"
        >
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      expect(screen.getByText("Open Labels").closest("div")).toHaveClass("custom-class")
    })

    it("configures ContentPopover with correct props", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      const popoverTrigger = screen.getByTestId("popover-trigger")
      expect(popoverTrigger).toHaveAttribute("data-side", "bottom")
      expect(popoverTrigger).toHaveAttribute("data-align", "start")
      expect(popoverTrigger).toHaveClass("w-80", "p-0", "max-h-[400px]", "overflow-hidden")
    })
  })

  describe("Props Handling", () => {
    it("supports task prop", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByTestId("label-content-taskId")).toHaveTextContent("undefined")
      expect(screen.getByTestId("label-content-task")).toHaveTextContent(task.id)
    })

    it("supports legacy task prop", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByTestId("label-content-task")).toHaveTextContent(task.id)
    })

    it("passes task prop correctly to LabelContent", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByTestId("label-content-taskId")).toHaveTextContent("undefined")
      expect(screen.getByTestId("label-content-task")).toHaveTextContent(task.id)
    })

    it("passes required callback props to LabelContent", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      // Test that callbacks work
      await user.click(screen.getByText("Mock Add Label"))
      expect(onAddLabel).toHaveBeenCalledWith("test label")

      await user.click(screen.getByText("Mock Remove Label"))
      expect(onRemoveLabel).toHaveBeenCalledWith(TEST_LABEL_ID_1)
    })
  })

  describe("Popover State Management", () => {
    it("opens popover when trigger is clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByTestId("popover-content")).toBeInTheDocument()
      expect(screen.getByTestId("label-content")).toBeInTheDocument()
    })

    it("closes popover when clicked again", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      // Open
      await user.click(screen.getByText("Open Labels"))
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()

      // Close
      await user.click(screen.getByText("Open Labels"))
      expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument()
    })

    it("calls onOpenChange callback when state changes", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()
      const onOpenChange = vi.fn()

      render(
        <LabelManagementPopover
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          onOpenChange={onOpenChange}
        >
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))
      expect(onOpenChange).toHaveBeenCalledWith(true)

      onOpenChange.mockClear()
      await user.click(screen.getByText("Open Labels"))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("Auto-start Adding Behavior", () => {
    it("auto-starts adding when opening with no labels (existing task)", async () => {
      const user = userEvent.setup()
      const taskWithNoLabels = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover
          task={taskWithNoLabels}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
        >
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByTestId("label-content-initial-adding")).toHaveTextContent("true")
      expect(screen.getByTestId("label-content-labels-count")).toHaveTextContent("0")
    })

    it("does not auto-start adding when opening with existing labels", async () => {
      const user = userEvent.setup()
      const taskWithLabels = createMockTask({
        labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
      })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover
          task={taskWithLabels}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
        >
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByTestId("label-content-initial-adding")).toHaveTextContent("false")
      expect(screen.getByTestId("label-content-labels-count")).toHaveTextContent("2")
    })

    it("does not auto-start adding when no task prop provided (quick-add mode)", async () => {
      const user = userEvent.setup()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByTestId("label-content-initial-adding")).toHaveTextContent("false")
      expect(screen.getByTestId("label-content-task")).toHaveTextContent("undefined")
    })
  })

  describe("Adding State Management", () => {
    it("resets adding state when popover closes", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      // Simulate starting to add
      await user.click(screen.getByText("Mock Start Adding"))

      // Close the popover
      await user.click(screen.getByText("Open Labels"))

      // Reopen to verify state was reset
      await user.click(screen.getByText("Open Labels"))

      // Since the task has no labels, it should auto-start again
      expect(screen.getByTestId("label-content-initial-adding")).toHaveTextContent("true")
    })

    it("closes popover when canceling add with no existing labels", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()

      // Simulate canceling add
      await user.click(screen.getByText("Mock Stop Adding"))

      // Popover should close because task has no labels
      expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument()
    })

    it("does not close popover when canceling add with existing labels", async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        labels: [TEST_LABEL_ID_1],
      })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()

      // Simulate canceling add
      await user.click(screen.getByText("Mock Stop Adding"))

      // Popover should remain open because task has existing labels
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()
    })

    it("does not close popover when canceling add in quick-add mode", async () => {
      const user = userEvent.setup()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()

      // Simulate canceling add
      await user.click(screen.getByText("Mock Stop Adding"))

      // Popover should remain open in quick-add mode (no task prop)
      expect(screen.getByTestId("popover-content")).toBeInTheDocument()
    })
  })

  describe("LabelContent Integration", () => {
    it("passes correct props to LabelContent", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByTestId("label-content-taskId")).toHaveTextContent("undefined")
      expect(screen.getByTestId("label-content-task")).toHaveTextContent(task.id)
      expect(screen.getByTestId("label-content-mode")).toHaveTextContent("popover")
    })

    it("synchronizes adding state with LabelContent", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] }) // No labels to trigger auto-start
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      // Should start with adding state true because no labels
      expect(screen.getByTestId("label-content-initial-adding")).toHaveTextContent("true")

      // Stop adding should close the popover
      await user.click(screen.getByText("Mock Stop Adding"))
      expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument()
    })
  })

  describe("Accessibility", () => {
    it("renders popover content with dialog role", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByRole("dialog")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("handles missing task and taskId gracefully", async () => {
      const user = userEvent.setup()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel}>
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      expect(screen.getByTestId("label-content-task")).toHaveTextContent("undefined")
      expect(screen.getByTestId("label-content-taskId")).toHaveTextContent("undefined")
      expect(screen.getByTestId("label-content-initial-adding")).toHaveTextContent("false")
    })

    it("handles task with undefined labels gracefully", async () => {
      const user = userEvent.setup()
      const taskWithUndefinedLabels = createMockTask()
      // @ts-expect-error - Testing edge case
      delete taskWithUndefinedLabels.labels
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelManagementPopover
          task={taskWithUndefinedLabels}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
        >
          <button>Open Labels</button>
        </LabelManagementPopover>,
      )

      await user.click(screen.getByText("Open Labels"))

      // Should not crash and should treat as having no labels
      expect(screen.getByTestId("label-content")).toBeInTheDocument()
    })
  })
})
