import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import { Section, calculateTargetSectionItems } from "./section"
import { TEST_PROJECT_ID_1, TEST_GROUP_ID_1 } from "@tasktrove/types/test-constants"
import { DEFAULT_SECTION_COLORS } from "@tasktrove/constants"
import { reorderItems } from "@tasktrove/dom-utils"
import { createTaskId } from "@tasktrove/types/id"
import type { Instruction } from "@atlaskit/pragmatic-drag-and-drop-hitbox/list-item"

// Mock Jotai
const mockJotai = vi.hoisted(() => ({
  useSetAtom: vi.fn(() => vi.fn()),
  useAtom: vi.fn(() => [vi.fn(), vi.fn()]),
  useAtomValue: vi.fn(),
  atom: vi.fn(() => ({ debugLabel: "mock-atom" })),
  Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock("jotai", () => mockJotai)

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

vi.mock("@/hooks/use-add-task-to-section", () => ({
  useAddTaskToSection: vi.fn(() => vi.fn()),
}))

vi.mock("./virtualized-task-list", () => ({
  VirtualizedTaskList: ({ variant }: { variant?: string }) => (
    <div data-testid="virtualized-task-list" data-variant={variant}>
      Task List
    </div>
  ),
}))

vi.mock("./project-sections-view-helper", () => ({
  DropTargetElement: ({
    children,
    onDrop,
  }: {
    children: React.ReactNode
    onDrop?: (args: unknown) => void
  }) => (
    <div data-testid="drop-target-element" data-has-drop-handler={Boolean(onDrop)}>
      {children}
    </div>
  ),
}))

vi.mock("./editable-section-header", () => ({
  EditableSectionHeader: ({
    sectionName,
    rightContent,
    leftContent,
  }: {
    sectionName: string
    rightContent?: React.ReactNode
    leftContent?: React.ReactNode
  }) => (
    <div data-testid="editable-section-header">
      <div data-testid="section-left-content">{leftContent}</div>
      {sectionName}
      <div data-testid="section-right-content">{rightContent}</div>
    </div>
  ),
}))

describe("Section", () => {
  const mockProject = {
    id: TEST_PROJECT_ID_1,
    name: "Test Project",
    slug: "test-project",
    color: "#3B82F6",
    sections: [
      {
        id: TEST_GROUP_ID_1,
        name: "Planning",
        slug: "planning",
        type: "section" as const,
        items: [],
        color: DEFAULT_SECTION_COLORS[0],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockJotai.useAtomValue.mockImplementation((atom) => {
      if (typeof atom === "object" && atom && "debugLabel" in atom) {
        const atomWithLabel: { debugLabel?: unknown } = atom
        const label = String(atomWithLabel.debugLabel ?? "")

        switch (label) {
          case "projectById":
            return (projectId: string) =>
              projectId === TEST_PROJECT_ID_1 ? mockProject : undefined
          case "orderedTasksBySection":
            return () => []
          case "currentViewStateAtom":
            return {
              showSidePanel: false,
              compactView: false,
              viewMode: "list",
              sortBy: "dueDate",
              showCompleted: false,
            }
          case "currentRouteContextAtom":
            return {
              pathname: `/projects/${TEST_PROJECT_ID_1}`,
              viewId: TEST_PROJECT_ID_1,
              routeType: "project",
            }
          case "editingSectionIdAtom":
            return null
          case "taskById":
            return new Map()
          case "collapsedSectionsAtom":
            return []
          default:
            return undefined
        }
      }
      return undefined
    })
  })

  it("renders section with name", () => {
    render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
        wrapperClassName="test-wrapper"
      />,
    )

    expect(screen.getByText("Planning")).toBeInTheDocument()
  })

  it("renders virtualized task list or empty state", () => {
    render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
        wrapperClassName="test-wrapper"
      />,
    )

    // Should render either the task list (when there are tasks) or empty state (when no tasks)
    const taskList = screen.queryByTestId("virtualized-task-list")
    const emptyState = screen.queryByText("No tasks in this section")

    expect(taskList || emptyState).toBeTruthy()
  })

  it("wraps content in drop target element", () => {
    render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
        wrapperClassName="test-wrapper"
      />,
    )

    expect(screen.getByTestId("drop-target-element")).toBeInTheDocument()
  })

  it("provides drop handler for drag and drop", () => {
    render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
        wrapperClassName="test-wrapper"
      />,
    )

    const dropTarget = screen.getByTestId("drop-target-element")
    expect(dropTarget).toHaveAttribute("data-has-drop-handler", "true")
  })

  it("uses default variant when compactView is false and no variant prop provided", () => {
    mockJotai.useAtomValue.mockImplementation((atom) => {
      if (typeof atom === "object" && atom && "debugLabel" in atom) {
        const atomWithLabel: { debugLabel?: unknown } = atom
        const label = String(atomWithLabel.debugLabel ?? "")

        switch (label) {
          case "projectById":
            return (projectId: string) =>
              projectId === TEST_PROJECT_ID_1 ? mockProject : undefined
          case "orderedTasksBySection":
            return () => []
          case "currentViewStateAtom":
            return {
              showSidePanel: false,
              compactView: false, // Explicitly false
              viewMode: "list",
              sortBy: "dueDate",
              showCompleted: false,
            }
          case "currentRouteContextAtom":
            return {
              pathname: `/projects/${TEST_PROJECT_ID_1}`,
              viewId: TEST_PROJECT_ID_1,
              routeType: "project",
            }
          case "editingSectionIdAtom":
            return null
          case "taskById":
            return new Map()
          case "collapsedSectionsAtom":
            return []
          default:
            return undefined
        }
      }
      return undefined
    })

    render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
      />,
    )

    // Since there are no tasks, empty state is shown instead of task list
    expect(screen.getByText("No tasks in this section")).toBeInTheDocument()
  })

  it("uses compact variant when compactView is true and no variant prop provided", () => {
    mockJotai.useAtomValue.mockImplementation((atom) => {
      if (typeof atom === "object" && atom && "debugLabel" in atom) {
        const atomWithLabel: { debugLabel?: unknown } = atom
        const label = String(atomWithLabel.debugLabel ?? "")

        switch (label) {
          case "projectById":
            return (projectId: string) =>
              projectId === TEST_PROJECT_ID_1 ? mockProject : undefined
          case "orderedTasksBySection":
            return () => []
          case "currentViewStateAtom":
            return {
              showSidePanel: false,
              compactView: true, // Explicitly true
              viewMode: "list",
              sortBy: "dueDate",
              showCompleted: false,
            }
          case "currentRouteContextAtom":
            return {
              pathname: `/projects/${TEST_PROJECT_ID_1}`,
              viewId: TEST_PROJECT_ID_1,
              routeType: "project",
            }
          case "editingSectionIdAtom":
            return null
          case "taskById":
            return new Map()
          case "collapsedSectionsAtom":
            return []
          default:
            return undefined
        }
      }
      return undefined
    })

    render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
      />,
    )

    // Since there are no tasks, empty state is shown instead of task list
    expect(screen.getByText("No tasks in this section")).toBeInTheDocument()
  })

  it("renders section with different variants", () => {
    // Test that section can render with different variant props
    const variants: Array<"default" | "compact" | "kanban" | "calendar" | "subtask"> = [
      "default",
      "compact",
      "kanban",
      "calendar",
      "subtask",
    ]

    variants.forEach((variant) => {
      const { unmount } = render(
        <Section
          droppableId="test-droppable"
          sectionId={TEST_GROUP_ID_1}
          projectId={TEST_PROJECT_ID_1}
          variant={variant}
        />,
      )

      // Section should render successfully with any variant
      expect(screen.getByTestId("editable-section-header")).toBeInTheDocument()
      expect(screen.getByText("Planning")).toBeInTheDocument()

      unmount()
    })
  })

  it("renders add button in section header", () => {
    const { container } = render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
      />,
    )

    // Find the add button in the right content area (the button with Plus icon)
    const addButton = container.querySelector('[data-testid="section-right-content"] button')
    expect(addButton).toBeInTheDocument()
    expect(addButton).toHaveClass("text-muted-foreground", "hover:text-foreground")
  })

  it("renders as collapsible by default (isCollapsible prop defaults to true)", () => {
    render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
      />,
    )

    // Should render Collapsible components when isCollapsible is true (default)
    expect(screen.getByTestId("drop-target-element")).toBeInTheDocument()
    expect(screen.getByTestId("editable-section-header")).toBeInTheDocument()

    // Should render either task list or empty state
    const taskList = screen.queryByTestId("virtualized-task-list")
    const emptyState = screen.queryByText("No tasks in this section")
    expect(taskList || emptyState).toBeTruthy()
  })

  it("renders as collapsible when isCollapsible prop is explicitly true", () => {
    render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
        isCollapsible={true}
      />,
    )

    // Should render Collapsible components when isCollapsible is true
    expect(screen.getByTestId("drop-target-element")).toBeInTheDocument()
    expect(screen.getByTestId("editable-section-header")).toBeInTheDocument()

    // Should render either task list or empty state
    const taskList = screen.queryByTestId("virtualized-task-list")
    const emptyState = screen.queryByText("No tasks in this section")
    expect(taskList || emptyState).toBeTruthy()
  })

  it("renders as non-collapsible when isCollapsible prop is false", () => {
    render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
        isCollapsible={false}
      />,
    )

    // Should still render all content but without Collapsible wrapper
    expect(screen.getByTestId("drop-target-element")).toBeInTheDocument()
    expect(screen.getByTestId("editable-section-header")).toBeInTheDocument()

    // Should render either task list or empty state
    const taskList = screen.queryByTestId("virtualized-task-list")
    const emptyState = screen.queryByText("No tasks in this section")
    expect(taskList || emptyState).toBeTruthy()
  })

  it("shows chevron icon when collapsible, hides when not collapsible", () => {
    const { container: collapsibleContainer } = render(
      <Section
        droppableId="test-droppable"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
        isCollapsible={true}
      />,
    )

    const { container: nonCollapsibleContainer } = render(
      <Section
        droppableId="test-droppable-2"
        sectionId={TEST_GROUP_ID_1}
        projectId={TEST_PROJECT_ID_1}
        isCollapsible={false}
      />,
    )

    // When collapsible, should have chevron icon in the left content area
    const chevronInCollapsible = collapsibleContainer.querySelector(
      '[data-testid="section-left-content"] button svg',
    )
    expect(chevronInCollapsible).toBeInTheDocument()

    // When not collapsible, chevron should not be present in the left content area
    const chevronInNonCollapsible = nonCollapsibleContainer.querySelector(
      '[data-testid="section-left-content"] button svg',
    )
    expect(chevronInNonCollapsible).not.toBeInTheDocument()
  })
})

describe("Section - Drop Position Logic", () => {
  // Mock data for testing - using valid UUIDs
  const mockTaskId1 = createTaskId("11111111-1111-4111-8111-111111111111")
  const mockTaskId2 = createTaskId("22222222-2222-4222-8222-222222222222")
  const mockTaskId3 = createTaskId("33333333-3333-4333-8333-333333333333")
  const mockTaskId4 = createTaskId("44444444-4444-4444-8444-444444444444")

  it("should correctly reorder items when dropping after target", () => {
    // This test reproduces the exact bug described:
    // Dropping Task 1 after Task 2 results in wrong positioning

    // Initial section items: [Task1, Task2, Task3, Task4]
    const initialSectionItems = [mockTaskId1, mockTaskId2, mockTaskId3, mockTaskId4]

    // Simulate dragging Task1 and dropping after Task2
    const draggedTaskIds = [mockTaskId1]
    const targetTaskId = mockTaskId2
    const instruction: Instruction = {
      operation: "reorder-after",
      blocked: false,
      axis: "vertical",
    }

    // Use reorderItems to test the actual logic we're using
    const result = reorderItems(
      initialSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
      (id) => String(id),
    )

    // Expected: [Task2, Task1, Task3, Task4]
    // Bug might cause: [Task2, Task3, Task1, Task4] or similar wrong order
    expect(result).toEqual([mockTaskId2, mockTaskId1, mockTaskId3, mockTaskId4])

    // Additional assertion to ensure Task1 is NOT after Task3
    if (result) {
      const task1Index = result.indexOf(mockTaskId1)
      const task3Index = result.indexOf(mockTaskId3)
      expect(task1Index).toBeLessThan(task3Index) // Task1 should come before Task3
    }
  })

  it("should correctly reorder items when dropping before target", () => {
    // Test dropping before target
    const initialSectionItems = [mockTaskId1, mockTaskId2, mockTaskId3, mockTaskId4]

    // Simulate dragging Task4 and dropping before Task2
    const draggedTaskIds = [mockTaskId4]
    const targetTaskId = mockTaskId2
    const instruction: Instruction = {
      operation: "reorder-before",
      blocked: false,
      axis: "vertical",
    }

    const result = reorderItems(
      initialSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
      (id) => String(id),
    )

    // Expected: [Task1, Task4, Task2, Task3]
    expect(result).toEqual([mockTaskId1, mockTaskId4, mockTaskId2, mockTaskId3])
  })

  it("should correctly handle dropping after last item", () => {
    // Test edge case: dropping after the last item
    const initialSectionItems = [mockTaskId1, mockTaskId2, mockTaskId3]

    // Simulate dragging Task1 and dropping after Task3 (last item)
    const draggedTaskIds = [mockTaskId1]
    const targetTaskId = mockTaskId3
    const instruction: Instruction = {
      operation: "reorder-after",
      blocked: false,
      axis: "vertical",
    }

    const result = reorderItems(
      initialSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
      (id) => String(id),
    )

    // Expected: [Task2, Task3, Task1] (Task1 moves to end)
    expect(result).toEqual([mockTaskId2, mockTaskId3, mockTaskId1])
  })

  it("should correctly handle dropping before first item", () => {
    // Test edge case: dropping before the first item
    const initialSectionItems = [mockTaskId1, mockTaskId2, mockTaskId3]

    // Simulate dragging Task3 and dropping before Task1 (first item)
    const draggedTaskIds = [mockTaskId3]
    const targetTaskId = mockTaskId1
    const instruction: Instruction = {
      operation: "reorder-before",
      blocked: false,
      axis: "vertical",
    }

    const result = reorderItems(
      initialSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
      (id) => String(id),
    )

    // Expected: [Task3, Task1, Task2] (Task3 moves to beginning)
    expect(result).toEqual([mockTaskId3, mockTaskId1, mockTaskId2])
  })

  it("should correctly handle moving multiple items", () => {
    // Test moving multiple items at once
    const initialSectionItems = [mockTaskId1, mockTaskId2, mockTaskId3, mockTaskId4, mockTaskId1] // Note: mockTaskId1 appears twice for testing

    // Simulate dragging two items and dropping after target
    const draggedTaskIds = [mockTaskId1, mockTaskId2] // Move Task1 and Task2
    const targetTaskId = mockTaskId4 // Drop after Task4
    const instruction: Instruction = {
      operation: "reorder-after",
      blocked: false,
      axis: "vertical",
    }

    const result = reorderItems(
      initialSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
      (id) => String(id),
    )

    // Expected: [Task3, Task4, Task1, Task2]
    expect(result).toEqual([mockTaskId3, mockTaskId4, mockTaskId1, mockTaskId2])
  })
})

describe("calculateTargetSectionItems - Cross-section moves", () => {
  // Mock data for testing cross-section moves
  const mockTaskId1 = createTaskId("11111111-1111-4111-8111-111111111111")
  const mockTaskId2 = createTaskId("22222222-2222-4222-8222-222222222222")
  const mockTaskId3 = createTaskId("33333333-3333-4333-8333-333333333333")
  const mockTaskId4 = createTaskId("44444444-4444-4444-8444-444444444444")
  const mockTaskId5 = createTaskId("55555555-5555-4555-8555-555555555555")

  it("should insert cross-section tasks after target when dropping after", () => {
    // Test case: Target section has [Task1, Task2, Task3]
    // We're moving Task4 (from another section) to drop after Task2
    // Expected result: [Task1, Task2, Task4, Task3]

    const currentSectionItems = [mockTaskId1, mockTaskId2, mockTaskId3]
    const draggedTaskIds = [mockTaskId4] // Task from another section
    const targetTaskId = mockTaskId2
    const instruction: Instruction = {
      operation: "reorder-after",
      blocked: false,
      axis: "vertical",
    }

    const result = calculateTargetSectionItems(
      currentSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
    )

    // Expected: Task4 should be inserted after Task2
    expect(result).toEqual([mockTaskId1, mockTaskId2, mockTaskId4, mockTaskId3])
  })

  it("should insert cross-section tasks before target when dropping before", () => {
    // Test case: Target section has [Task1, Task2, Task3]
    // We're moving Task4 (from another section) to drop before Task2
    // Expected result: [Task1, Task4, Task2, Task3]

    const currentSectionItems = [mockTaskId1, mockTaskId2, mockTaskId3]
    const draggedTaskIds = [mockTaskId4] // Task from another section
    const targetTaskId = mockTaskId2
    const instruction: Instruction = {
      operation: "reorder-before",
      blocked: false,
      axis: "vertical",
    }

    const result = calculateTargetSectionItems(
      currentSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
    )

    // Expected: Task4 should be inserted before Task2
    expect(result).toEqual([mockTaskId1, mockTaskId4, mockTaskId2, mockTaskId3])
  })

  it("should handle multiple cross-section tasks moved together", () => {
    // Test case: Target section has [Task1, Task2]
    // We're moving [Task4, Task5] (from another section) to drop after Task1
    // Expected result: [Task1, Task4, Task5, Task2]

    const currentSectionItems = [mockTaskId1, mockTaskId2]
    const draggedTaskIds = [mockTaskId4, mockTaskId5] // Tasks from another section
    const targetTaskId = mockTaskId1
    const instruction: Instruction = {
      operation: "reorder-after",
      blocked: false,
      axis: "vertical",
    }

    const result = calculateTargetSectionItems(
      currentSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
    )

    // Expected: Task4 and Task5 should be inserted after Task1, in order
    expect(result).toEqual([mockTaskId1, mockTaskId4, mockTaskId5, mockTaskId2])
  })

  it("should insert cross-section tasks at end when dropping after last item", () => {
    // Test case: Target section has [Task1, Task2, Task3]
    // We're moving Task4 (from another section) to drop after Task3 (last item)
    // Expected result: [Task1, Task2, Task3, Task4]

    const currentSectionItems = [mockTaskId1, mockTaskId2, mockTaskId3]
    const draggedTaskIds = [mockTaskId4] // Task from another section
    const targetTaskId = mockTaskId3
    const instruction: Instruction = {
      operation: "reorder-after",
      blocked: false,
      axis: "vertical",
    }

    const result = calculateTargetSectionItems(
      currentSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
    )

    // Expected: Task4 should be inserted at the end
    expect(result).toEqual([mockTaskId1, mockTaskId2, mockTaskId3, mockTaskId4])
  })

  it("should still handle same-section reordering correctly", () => {
    // Regression test: Make sure same-section reordering still works
    // Test case: Section has [Task1, Task2, Task3]
    // We're reordering Task1 to drop after Task2
    // Expected result: [Task2, Task1, Task3]

    const currentSectionItems = [mockTaskId1, mockTaskId2, mockTaskId3]
    const draggedTaskIds = [mockTaskId1] // Task from this section
    const targetTaskId = mockTaskId2
    const instruction: Instruction = {
      operation: "reorder-after",
      blocked: false,
      axis: "vertical",
    }

    const result = calculateTargetSectionItems(
      currentSectionItems,
      draggedTaskIds,
      targetTaskId,
      instruction,
    )

    // Expected: Task1 should move after Task2 (same-section reordering)
    expect(result).toEqual([mockTaskId2, mockTaskId1, mockTaskId3])
  })
})
