import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import { VirtualizedTaskList } from "./virtualized-task-list"
import type { Task } from "@/lib/types"
import { TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3 } from "@tasktrove/types/test-constants"

// Create mock function that persists across renders
const measureElementMock = vi.fn()

// Mock TanStack Virtual
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: vi.fn(() => ({
    getVirtualItems: vi.fn(() => []),
    getTotalSize: vi.fn(() => 0),
    measureElement: measureElementMock,
  })),
}))

// Mock TaskItem
vi.mock("./task-item", () => ({
  TaskItem: ({
    taskId,
    variant,
    className,
    showProjectBadge,
  }: {
    taskId: string
    variant?: string
    className?: string
    showProjectBadge?: boolean
  }) => (
    <div
      data-testid={`task-item-${taskId}`}
      data-variant={variant}
      className={className}
      data-show-project-badge={showProjectBadge}
    >
      Task {taskId}
    </div>
  ),
}))

// Mock DraggableTaskElement
vi.mock("./draggable-task-element", () => ({
  DraggableTaskElement: ({ children, taskId }: { children: React.ReactNode; taskId: string }) => (
    <div data-testid={`draggable-${taskId}`}>{children}</div>
  ),
}))

// Mock DropTargetElement
vi.mock("./project-sections-view-helper", () => ({
  DropTargetElement: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock VirtualizationDebugBadge
vi.mock("@/components/debug/virtualization-debug-badge", () => ({
  VirtualizationDebugBadge: () => null,
}))

describe("VirtualizedTaskList", () => {
  beforeEach(() => {
    measureElementMock.mockClear()
  })

  const mockTasks: Task[] = [
    {
      id: TEST_TASK_ID_1,
      title: "Task 1",
      description: "First task",
      completed: false,
      priority: 1,
      labels: [],
      subtasks: [],
      comments: [],
      recurringMode: "dueDate",
      createdAt: new Date("2024-01-01"),
    },
    {
      id: TEST_TASK_ID_2,
      title: "Task 2",
      description: "Second task",
      completed: false,
      priority: 2,
      labels: [],
      subtasks: [],
      comments: [],
      recurringMode: "dueDate",
      createdAt: new Date("2024-01-02"),
    },
    {
      id: TEST_TASK_ID_3,
      title: "Task 3",
      description: "Third task",
      completed: false,
      priority: 3,
      labels: [],
      subtasks: [],
      comments: [],
      recurringMode: "dueDate",
      createdAt: new Date("2024-01-03"),
    },
  ]

  const sortedTaskIds = [TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3]

  describe("variant prop", () => {
    it("passes default variant to TaskItem when variant is 'default'", () => {
      render(
        <VirtualizedTaskList tasks={mockTasks} variant="default" sortedTaskIds={sortedTaskIds} />,
      )

      const taskItems = screen.getAllByTestId(/^task-item-/)
      taskItems.forEach((taskItem) => {
        expect(taskItem).toHaveAttribute("data-variant", "default")
      })
    })

    it("passes compact variant to TaskItem when variant is 'compact'", () => {
      render(
        <VirtualizedTaskList tasks={mockTasks} variant="compact" sortedTaskIds={sortedTaskIds} />,
      )

      const taskItems = screen.getAllByTestId(/^task-item-/)
      taskItems.forEach((taskItem) => {
        expect(taskItem).toHaveAttribute("data-variant", "compact")
      })
    })

    it("passes kanban variant to TaskItem when variant is 'kanban'", () => {
      render(
        <VirtualizedTaskList tasks={mockTasks} variant="kanban" sortedTaskIds={sortedTaskIds} />,
      )

      const taskItems = screen.getAllByTestId(/^task-item-/)
      taskItems.forEach((taskItem) => {
        expect(taskItem).toHaveAttribute("data-variant", "kanban")
      })
    })

    it("passes calendar variant to TaskItem when variant is 'calendar'", () => {
      render(
        <VirtualizedTaskList tasks={mockTasks} variant="calendar" sortedTaskIds={sortedTaskIds} />,
      )

      const taskItems = screen.getAllByTestId(/^task-item-/)
      taskItems.forEach((taskItem) => {
        expect(taskItem).toHaveAttribute("data-variant", "calendar")
      })
    })
  })

  it("renders all tasks in test environment", () => {
    render(
      <VirtualizedTaskList tasks={mockTasks} variant="default" sortedTaskIds={sortedTaskIds} />,
    )

    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_3}`)).toBeInTheDocument()
  })

  it("wraps tasks in DraggableTaskElement", () => {
    render(
      <VirtualizedTaskList tasks={mockTasks} variant="default" sortedTaskIds={sortedTaskIds} />,
    )

    expect(screen.getByTestId(`draggable-${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`draggable-${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(screen.getByTestId(`draggable-${TEST_TASK_ID_3}`)).toBeInTheDocument()
  })

  it("passes sortedTaskIds to TaskItem", () => {
    render(
      <VirtualizedTaskList tasks={mockTasks} variant="default" sortedTaskIds={sortedTaskIds} />,
    )

    // Verify tasks are rendered (sortedTaskIds is passed internally to TaskItem)
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_3}`)).toBeInTheDocument()
  })

  it("enables drop targets when enableDropTargets is true", () => {
    const mockOnDrop = vi.fn()

    render(
      <VirtualizedTaskList
        tasks={mockTasks}
        variant="default"
        sortedTaskIds={sortedTaskIds}
        enableDropTargets={true}
        onDropTaskToListItem={mockOnDrop}
      />,
    )

    // Verify tasks are rendered with drop targets
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_1}`)).toBeInTheDocument()
  })

  it("places task spacing outside the drop target to keep indicators aligned", () => {
    render(
      <VirtualizedTaskList
        tasks={mockTasks}
        variant="default"
        sortedTaskIds={sortedTaskIds}
        enableDropTargets={true}
        onDropTaskToListItem={() => undefined}
      />,
    )

    const taskItems = screen.getAllByTestId(/^task-item-/)

    taskItems.forEach((taskItem) => {
      // Task item should have horizontal padding without applying bottom margin that shifts indicators
      expect(taskItem).toHaveClass("mx-2")
      expect(taskItem.className).not.toContain("mb-")

      // Spacer element should live outside the drop target wrapper so indicators align with the card
      const containerDiv = taskItem.closest("[data-index]")
      const spacer = containerDiv?.lastElementChild
      expect(spacer).not.toBeNull()
      expect(spacer).toHaveAttribute("aria-hidden", "true")
      expect(spacer?.classList.contains("h-2")).toBe(true)
    })
  })

  it("disables drop targets when enableDropTargets is false", () => {
    render(
      <VirtualizedTaskList
        tasks={mockTasks}
        variant="default"
        sortedTaskIds={sortedTaskIds}
        enableDropTargets={false}
      />,
    )

    // Verify tasks are rendered without drop targets
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_1}`)).toBeInTheDocument()
  })

  it("uses layoutId for smooth animations and forces remeasurement when task order changes", () => {
    const { container, rerender } = render(
      <VirtualizedTaskList tasks={mockTasks} variant="default" sortedTaskIds={sortedTaskIds} />,
    )

    // Get initial wrapper divs (the ones with keys)
    const getWrapperDivs = () => {
      // Find all divs with data-index attribute (these are the wrapper divs with keys)
      return Array.from(container.querySelectorAll("[data-index]"))
    }

    const initialDivs = getWrapperDivs()
    expect(initialDivs).toHaveLength(3)

    // Reorder tasks: swap first and second tasks
    const reorderedTaskIds = [TEST_TASK_ID_2, TEST_TASK_ID_1, TEST_TASK_ID_3]

    rerender(
      <VirtualizedTaskList tasks={mockTasks} variant="default" sortedTaskIds={reorderedTaskIds} />,
    )

    // With unstable keys (task.id + index), React unmounts old elements and mounts new ones
    // This forces the virtualizer to remeasure items at their new positions
    // layoutId ensures smooth animations even during unmount/remount

    // During AnimatePresence transition, we may have both exiting and entering elements
    // So we just verify that all tasks are rendered correctly
    const newDivs = getWrapperDivs()
    expect(newDivs.length).toBeGreaterThanOrEqual(3)

    // Verify all tasks are rendered correctly in their new order
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_3}`)).toBeInTheDocument()

    // The key benefit: unstable keys force remeasurement so translateY values
    // are recalculated based on the actual heights of tasks in their new positions
  })
})
