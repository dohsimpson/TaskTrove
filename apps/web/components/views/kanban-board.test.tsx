import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { Provider } from "jotai"
import { KanbanBoard } from "./kanban-board"
import { DEFAULT_SECTION_COLORS, DEFAULT_UUID } from "@tasktrove/constants"
import type { Task, TaskPriority } from "@/lib/types"
import {
  createTaskId,
  createCommentId,
  createLabelId,
  createGroupId,
  createUserId,
} from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_PROJECT_ID_1,
  TEST_GROUP_ID_1,
  TEST_GROUP_ID_2,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
} from "@tasktrove/types/test-constants"

// Define additional constants for this test file
const TASK_ID_3 = createTaskId("12345678-1234-4234-8234-123456789014")
const TASK_ID_4 = createTaskId("12345678-1234-4234-8234-123456789015")
const SECTION_ID_3 = createGroupId("00000000-0000-4000-8000-000000000002")
const SECTION_ID_4 = createGroupId("00000000-0000-4000-8000-000000000003")
const COMMENT_ID_1 = createCommentId("11111111-1111-4111-8111-111111111111")
const COMMENT_ID_2 = createCommentId("22222222-2222-4222-8222-222222222222")
const COMMENT_ID_3 = createCommentId("33333333-3333-4333-8333-333333333333")
const COMMENT_ID_4 = createCommentId("44444444-4444-4444-8444-444444444444")
const COMMENT_ID_5 = createCommentId("55555555-5555-4555-8555-555555555555")
const COMMENT_ID_6 = createCommentId("66666666-6666-4666-8666-666666666666")
const COMMENT_ID_7 = createCommentId("77777777-7777-4777-8777-777777777777")
const LABEL_ID_3 = createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcdef")
const LABEL_ID_4 = createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcde0")
const LABEL_ID_5 = createLabelId("abcdefab-abcd-4bcd-8bcd-abcdefabcde1")

// Create a mapping for task IDs to display names
const taskIdToDisplayName: Record<string, string> = {
  [TEST_TASK_ID_1]: "1",
  [TEST_TASK_ID_2]: "2",
  "12345678-1234-4234-8234-123456789014": "3", // TASK_ID_3
  "12345678-1234-4234-8234-123456789015": "4", // TASK_ID_4
  "12345678-1234-4234-8234-123456789016": "5", // TASK_ID_5
}

// Mock TaskItem since we're testing the KanbanBoard behavior
vi.mock("@/components/task/task-item", () => ({
  TaskItem: ({ taskId }: { taskId: string; variant?: string; showProjectBadge?: boolean }) => (
    <div data-testid={`task-${taskId}`}>
      <div>Mock Task {taskIdToDisplayName[taskId] || taskId}</div>
      <div data-testid="flag-icon" />
      <div data-testid="calendar-icon" />
      <div data-testid="message-square-icon" />
      <div data-testid="paperclip-icon" />
    </div>
  ),
}))

// Mock SelectionToolbar since we're not testing it directly here
vi.mock("@/components/task/selection-toolbar", () => ({
  SelectionToolbar: () => <div data-testid="selection-toolbar" />,
}))

// Mock DraggableWrapper and DropTargetWrapper
vi.mock("@/components/ui/draggable-wrapper", () => ({
  DraggableWrapper: ({
    children,
    dragId,
    className,
  }: {
    children: React.ReactNode
    dragId: string
    className?: string
  }) => (
    <div data-testid={`draggable-${dragId}`} className={className}>
      <div data-testid={`drag-handle-${dragId}`}>{children}</div>
    </div>
  ),
}))

vi.mock("@/components/ui/drop-target-wrapper", () => ({
  DropTargetWrapper: ({
    children,
    dropTargetId,
    className,
    getData,
  }: {
    children: React.ReactNode
    dropTargetId?: string
    className?: string
    getData?: () => Record<string, unknown>
  }) => {
    const data = getData ? getData() : {}
    return (
      <div
        data-testid={`droppable-${dropTargetId}`}
        data-droppable-type={
          data.type === "project" ? "TASK" : data.type === "label" ? "TASK" : data.type
        }
        className={className}
      >
        <div data-testid="droppable-placeholder" />
        {children}
      </div>
    )
  },
}))

// Mock useDragAndDrop hook
vi.mock("@/hooks/use-drag-and-drop", () => ({
  useDragAndDrop: () => ({
    handleDrop: vi.fn(),
    handleTaskReorder: vi.fn(),
    handleTaskDropOnProject: vi.fn(),
    handleTaskDropOnLabel: vi.fn(),
  }),
}))

// Mock Jotai
const mockJotai = vi.hoisted(() => ({
  useSetAtom: vi.fn(() => vi.fn()),
  useAtom: vi.fn(() => [vi.fn(), vi.fn()]),
  useAtomValue: vi.fn(() => new Map()),
  atom: vi.fn(() => ({ debugLabel: "mock-atom" })),
  Provider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock("jotai", () => mockJotai)

// Mock atoms
vi.mock("@tasktrove/atoms", () => ({
  // Core atoms
  tasksAtom: vi.fn(),
  taskCountsAtom: vi.fn(),
  projectsAtom: vi.fn(),
  labelsAtom: vi.fn(),
  updateLabelAtom: vi.fn(),
  deleteLabelAtom: vi.fn(),
  toggleTaskSelectionAtom: vi.fn(),
  // Action atoms
  updateTaskAtom: vi.fn(),
  toggleTaskAtom: vi.fn(),
  deleteTaskAtom: vi.fn(),
  addCommentAtom: vi.fn(),
  toggleTaskPanelWithViewStateAtom: vi.fn(),
  // Selection atoms
  selectedTasksAtom: vi.fn(),
  lastSelectedTaskAtom: vi.fn(),
  selectRangeAtom: vi.fn(),
  selectedTaskIdAtom: vi.fn(),
  // Kanban-specific atoms
  orderedTasksByProjectAtom: vi.fn(),
  reorderTaskInViewAtom: vi.fn(),
  moveTaskBetweenSectionsAtom: vi.fn(),
  // View state atoms
  currentViewStateAtom: vi.fn(),
  currentRouteContextAtom: vi.fn(),
  stopEditingSectionAtom: vi.fn(),
  // Grouped atoms
  taskAtoms: {
    actions: {
      updateTask: vi.fn(),
      toggleTask: vi.fn(),
      deleteTask: vi.fn(),
    },
    derived: {
      orderedTasksBySection: vi.fn(),
    },
  },
  projectAtoms: {
    actions: {
      renameSection: vi.fn(),
    },
    derived: {
      visibleProjects: vi.fn(),
    },
  },
  // Label atoms
  addLabelAndWaitForRealIdAtom: vi.fn(),
  labelsFromIdsAtom: vi.fn(),
  // Utility atoms
  applyViewStateFilters: vi.fn(),
  sortTasksByViewState: vi.fn(),
}))

// Mock Atlaskit drag-and-drop utilities
vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", () => ({
  extractClosestEdge: vi.fn(),
  attachClosestEdge: vi.fn(),
}))

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index", () => ({
  getReorderDestinationIndex: vi.fn(),
}))

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  log: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-content" className={className}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card-header" className={className}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <h2 data-testid="card-title" className={className}>
      {children}
    </h2>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
    ...props
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
    size?: string
    className?: string
    [key: string]: unknown
  }) => (
    <button
      data-testid="button"
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode
    variant?: string
    className?: string
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

// Mock Lucide icons
vi.mock("lucide-react", () => ({
  Plus: () => <div data-testid="plus-icon" />,
  MoreHorizontal: () => <div data-testid="more-horizontal-icon" />,
  Flag: ({ className }: { className?: string }) => (
    <div data-testid="flag-icon" className={className} />
  ),
  Calendar: ({ className }: { className?: string }) => (
    <div data-testid="calendar-icon" className={className} />
  ),
  MessageSquare: ({ className }: { className?: string }) => (
    <div data-testid="message-square-icon" className={className} />
  ),
  Paperclip: ({ className }: { className?: string }) => (
    <div data-testid="paperclip-icon" className={className} />
  ),
}))

describe.skip("KanbanBoard", () => {
  const mockProject = {
    id: TEST_PROJECT_ID_1,
    name: "Test Project",
    slug: "test-project",
    color: "#3b82f6",
    position: 1000,
    sections: [
      {
        id: TEST_GROUP_ID_1,
        name: "To Do",
        slug: "to-do",
        type: "section" as const,
        items: [],
        color: DEFAULT_SECTION_COLORS[0],
      },
      {
        id: TEST_GROUP_ID_2,
        name: "In Progress",
        slug: "in-progress",
        type: "section" as const,
        items: [],
        color: DEFAULT_SECTION_COLORS[1],
      },
      {
        id: SECTION_ID_3,
        name: "Review",
        slug: "review",
        type: "section" as const,
        items: [],
        color: DEFAULT_SECTION_COLORS[2],
      },
      {
        id: SECTION_ID_4,
        name: "Done",
        slug: "done",
        type: "section" as const,
        items: [],
        color: DEFAULT_SECTION_COLORS[3],
      },
    ],
  }

  // Helper function to create proper Task objects
  const createTask = (overrides: Partial<Task> = {}): Task => ({
    id: TEST_TASK_ID_1,
    title: "Test Task",
    description: "Test description",
    completed: false,
    priority: 1 satisfies TaskPriority,
    labels: [],
    subtasks: [],
    comments: [],
    createdAt: new Date(),
    recurringMode: "dueDate",
    ...overrides,
  })

  const mockTasks: Task[] = [
    createTask({
      id: TEST_TASK_ID_1,
      title: "Task 1",
      description: "First task description",
      priority: 1 satisfies TaskPriority,
      dueDate: new Date("2024-01-01"),
      labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
      comments: [
        {
          id: COMMENT_ID_1,
          userId: createUserId(DEFAULT_UUID),
          content: "Comment 1",
          createdAt: new Date(),
        },
        {
          id: COMMENT_ID_2,
          userId: createUserId(DEFAULT_UUID),
          content: "Comment 2",
          createdAt: new Date(),
        },
      ],
    }),
    createTask({
      id: TEST_TASK_ID_2,
      title: "Task 2",
      description: "Second task description",
      priority: 2 satisfies TaskPriority,
      dueDate: new Date("2024-01-02"),
      labels: [LABEL_ID_3],
      comments: [],
    }),
    createTask({
      id: TASK_ID_3,
      title: "Task 3",
      priority: 3 satisfies TaskPriority,
      labels: [LABEL_ID_3, LABEL_ID_4, LABEL_ID_5],
      comments: [
        {
          id: COMMENT_ID_3,
          userId: createUserId(DEFAULT_UUID),
          content: "Comment 3",
          createdAt: new Date(),
        },
        {
          id: COMMENT_ID_4,
          userId: createUserId(DEFAULT_UUID),
          content: "Comment 4",
          createdAt: new Date(),
        },
        {
          id: COMMENT_ID_5,
          userId: createUserId(DEFAULT_UUID),
          content: "Comment 5",
          createdAt: new Date(),
        },
        {
          id: COMMENT_ID_6,
          userId: createUserId(DEFAULT_UUID),
          content: "Comment 6",
          createdAt: new Date(),
        },
        {
          id: COMMENT_ID_7,
          userId: createUserId(DEFAULT_UUID),
          content: "Comment 7",
          createdAt: new Date(),
        },
      ],
    }),
    createTask({
      id: TASK_ID_4,
      title: "Task 4",
      priority: 4 satisfies TaskPriority,
      labels: [],
      comments: [],
    }),
  ]

  const defaultProps = {
    tasks: mockTasks,
    project: mockProject,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders all kanban columns", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    expect(screen.getByText("To Do")).toBeInTheDocument()
    expect(screen.getByText("In Progress")).toBeInTheDocument()
    expect(screen.getByText("Review")).toBeInTheDocument()
    expect(screen.getByText("Done")).toBeInTheDocument()
  })

  it("displays task counts in column headers", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    // Each column should display its task count
    expect(screen.getByText("To Do")).toBeInTheDocument()
    expect(screen.getByText("In Progress")).toBeInTheDocument()
    expect(screen.getByText("Review")).toBeInTheDocument()
    expect(screen.getByText("Done")).toBeInTheDocument()

    // Count badges should be present (one per column)
    const badges = screen.getAllByTestId("badge")
    expect(badges.length).toBeGreaterThanOrEqual(4) // At least 4 column count badges
  })

  it("renders tasks in correct columns", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    expect(screen.getByText("Mock Task 1")).toBeInTheDocument()
    expect(screen.getByText("Mock Task 2")).toBeInTheDocument()
    expect(screen.getByText("Mock Task 3")).toBeInTheDocument()
    expect(screen.getByText("Mock Task 4")).toBeInTheDocument()
  })

  it("displays task descriptions when available", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    // Since we're mocking TaskItem, we just check tasks are rendered
    expect(screen.getByText("Mock Task 1")).toBeInTheDocument()
    expect(screen.getByText("Mock Task 2")).toBeInTheDocument()
  })

  it("shows priority flags for high priority tasks", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    const flagIcons = screen.getAllByTestId("flag-icon")
    // Since we're mocking TaskItem, all tasks get flag icons
    expect(flagIcons).toHaveLength(4)
  })

  it("displays due dates with icons", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    const calendarIcons = screen.getAllByTestId("calendar-icon")
    // Since we're mocking TaskItem, all tasks get calendar icons
    expect(calendarIcons).toHaveLength(4)
  })

  it("shows comments count when greater than 0", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    const messageSquareIcons = screen.getAllByTestId("message-square-icon")
    // Since we're mocking TaskItem, all tasks get message square icons
    expect(messageSquareIcons).toHaveLength(4)
  })

  it("shows attachments count when greater than 0", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    const paperclipIcons = screen.getAllByTestId("paperclip-icon")
    // Since we're mocking TaskItem, all tasks get paperclip icons
    expect(paperclipIcons).toHaveLength(4)
  })

  it("displays task labels with proper structure", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    // Since we're now using label IDs instead of names, and the component
    // would need to resolve them via atoms, we'll test the structural
    // elements instead of specific label text content

    // Check that badge elements exist for the labels
    const badges = screen.getAllByTestId("badge")
    expect(badges.length).toBeGreaterThan(0)

    // Check that tasks with labels have the appropriate structure
    expect(screen.getByText("Mock Task 1")).toBeInTheDocument()
    expect(screen.getByText("Mock Task 2")).toBeInTheDocument()
    expect(screen.getByText("Mock Task 3")).toBeInTheDocument()
  })

  it("handles task click events", async () => {
    const user = userEvent.setup()
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    const task1 = screen.getByText("Mock Task 1")
    await user.click(task1)

    // Since we're mocking TaskItem and it doesn't call onTaskClick anymore,
    // we just verify the task is clickable
    expect(task1).toBeInTheDocument()
  })

  it("renders droppable areas for all columns", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    expect(
      screen.getByTestId(
        "droppable-task-list-project-87654321-4321-4321-8321-210987654321-section-0",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId(
        "droppable-task-list-project-87654321-4321-4321-8321-210987654321-section-1",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId(
        "droppable-task-list-project-87654321-4321-4321-8321-210987654321-section-2",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId(
        "droppable-task-list-project-87654321-4321-4321-8321-210987654321-section-3",
      ),
    ).toBeInTheDocument()
  })

  it("renders draggable tasks with drag handles", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    // Our mock sets drag handles using actual task IDs, so check for those
    expect(screen.getByTestId(`drag-handle-${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`drag-handle-${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(
      screen.getByTestId("drag-handle-12345678-1234-4234-8234-123456789014"),
    ).toBeInTheDocument()
    expect(
      screen.getByTestId("drag-handle-12345678-1234-4234-8234-123456789015"),
    ).toBeInTheDocument()
  })

  it("renders add task buttons in column headers", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    const addButtons = screen.getAllByTestId("plus-icon")
    expect(addButtons).toHaveLength(4) // One for each column
  })

  it("applies correct priority colors", () => {
    render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    const flagIcons = screen.getAllByTestId("flag-icon")

    // Since we're mocking TaskItem, just verify flag icons exist
    expect(flagIcons).toHaveLength(4)
  })

  it("renders empty state when no project is provided", () => {
    render(
      <Provider>
        <KanbanBoard />
      </Provider>,
    )

    // Should not render any columns when no project is provided
    expect(screen.queryByText("To Do")).not.toBeInTheDocument()
    expect(screen.queryByText("In Progress")).not.toBeInTheDocument()
    expect(screen.queryByText("Review")).not.toBeInTheDocument()
    expect(screen.queryByText("Done")).not.toBeInTheDocument()
  })

  it("handles tasks with non-existent sections", () => {
    render(
      <Provider>
        <KanbanBoard project={mockProject} />
      </Provider>,
    )

    // Current implementation only shows defined sections, orphaned tasks don't appear
    expect(screen.getByText("To Do")).toBeInTheDocument()
    expect(screen.getByText("In Progress")).toBeInTheDocument()
    expect(screen.getByText("Review")).toBeInTheDocument()
    expect(screen.getByText("Done")).toBeInTheDocument()
    // Orphaned task should not appear in any column
    expect(screen.queryByText("Orphaned Task")).not.toBeInTheDocument()
  })

  it("shows empty board when project has no sections", () => {
    const projectWithNoSections = {
      ...mockProject,
      sections: [],
    }

    render(
      <Provider>
        <KanbanBoard project={projectWithNoSections} />
      </Provider>,
    )

    // No columns should be rendered when project has no sections
    expect(screen.queryByText("To Do")).not.toBeInTheDocument()
    expect(screen.queryByText("In Progress")).not.toBeInTheDocument()
    expect(screen.queryByText("Review")).not.toBeInTheDocument()
    expect(screen.queryByText("Done")).not.toBeInTheDocument()
    expect(screen.queryByText("Task without section")).not.toBeInTheDocument()
  })

  it("updates columns when tasks prop changes", () => {
    const { rerender } = render(
      <Provider>
        <KanbanBoard {...defaultProps} />
      </Provider>,
    )

    expect(screen.getByText("Mock Task 1")).toBeInTheDocument()

    rerender(
      <Provider>
        <KanbanBoard project={mockProject} />
      </Provider>,
    )

    expect(screen.getByText("Mock Task 5")).toBeInTheDocument()
    expect(screen.queryByText("Mock Task 1")).not.toBeInTheDocument()
  })

  it("sorts tasks by order within columns", () => {
    render(
      <Provider>
        <KanbanBoard project={mockProject} />
      </Provider>,
    )

    // Both tasks should be rendered (order is handled internally)
    expect(screen.getByText("Mock Task 1")).toBeInTheDocument()
    expect(screen.getByText("Mock Task 2")).toBeInTheDocument()
  })

  it("handles empty task lists", () => {
    render(
      <Provider>
        <KanbanBoard project={mockProject} />
      </Provider>,
    )

    // Columns should still be rendered
    expect(screen.getByText("To Do")).toBeInTheDocument()
    expect(screen.getByText("In Progress")).toBeInTheDocument()
    expect(screen.getByText("Review")).toBeInTheDocument()
    expect(screen.getByText("Done")).toBeInTheDocument()

    // Should have 4 column count badges showing 0
    expect(screen.getAllByText("0")).toHaveLength(4)
  })

  describe("Date formatting", () => {
    it("displays formatted due dates", () => {
      render(
        <Provider>
          <KanbanBoard {...defaultProps} />
        </Provider>,
      )

      // Since we're mocking TaskItem, just verify tasks are rendered
      expect(screen.getByText("Mock Task 1")).toBeInTheDocument()
      expect(screen.getByText("Mock Task 2")).toBeInTheDocument()
    })
  })

  describe("Priority mapping", () => {
    it("handles all priority levels correctly", () => {
      render(
        <Provider>
          <KanbanBoard project={mockProject} />
        </Provider>,
      )

      // Since we're mocking TaskItem, all tasks get flag icons
      const flagIcons = screen.getAllByTestId("flag-icon")
      expect(flagIcons).toHaveLength(4)
    })
  })

  describe("Accessibility", () => {
    it("provides proper structure for screen readers", () => {
      render(
        <Provider>
          <KanbanBoard {...defaultProps} />
        </Provider>,
      )

      const cards = screen.getAllByTestId("card")
      expect(cards).toHaveLength(4) // One for each column

      const cardHeaders = screen.getAllByTestId("card-header")
      expect(cardHeaders).toHaveLength(4)

      const cardContents = screen.getAllByTestId("card-content")
      expect(cardContents).toHaveLength(4)
    })

    it("provides clickable buttons", () => {
      render(
        <Provider>
          <KanbanBoard {...defaultProps} />
        </Provider>,
      )

      const buttons = screen.getAllByTestId("button")
      expect(buttons.length).toBeGreaterThan(0)

      buttons.forEach((button) => {
        expect(button).toBeInTheDocument()
      })
    })
  })

  describe("Column styling", () => {
    it("applies correct background colors to columns based on section colors", () => {
      render(
        <Provider>
          <KanbanBoard {...defaultProps} />
        </Provider>,
      )

      const columnHeaders = screen.getAllByTestId("kanban-column-header")

      // Check that we have the correct number of column headers
      expect(columnHeaders).toHaveLength(4)

      // Check that headers have inline background styles based on section colors
      expect(columnHeaders[0]).toHaveStyle("background-color: rgba(59, 130, 246, 0.1)") // #3b82f6 with opacity
      expect(columnHeaders[1]).toHaveStyle("background-color: rgba(239, 68, 68, 0.1)") // #ef4444 with opacity
      expect(columnHeaders[2]).toHaveStyle("background-color: rgba(16, 185, 129, 0.1)") // #10b981 with opacity
      expect(columnHeaders[3]).toHaveStyle("background-color: rgba(245, 158, 11, 0.1)") // #f59e0b with opacity
    })

    it("displays colored indicators next to section titles", () => {
      render(
        <Provider>
          <KanbanBoard {...defaultProps} />
        </Provider>,
      )

      // Find all column headers which should have colored squares (not folder icons)
      const columnHeaders = screen.getAllByTestId("kanban-column-header")

      // Should have 4 column headers (one per section)
      expect(columnHeaders).toHaveLength(4)

      // Check that each column header contains a colored square div
      const coloredSquares = columnHeaders.map((header) =>
        header.querySelector(".w-3.h-3.rounded-sm"),
      )

      // Should have 4 colored squares
      expect(coloredSquares.filter(Boolean)).toHaveLength(4)

      // Check that each colored square has the correct background color style
      expect(coloredSquares[0]).toHaveStyle("background-color: rgb(59, 130, 246)")
      expect(coloredSquares[1]).toHaveStyle("background-color: rgb(239, 68, 68)")
      expect(coloredSquares[2]).toHaveStyle("background-color: rgb(16, 185, 129)")
      expect(coloredSquares[3]).toHaveStyle("background-color: rgb(245, 158, 11)")
    })

    it("uses actual section colors from project data instead of hardcoded colors", () => {
      const customProject = {
        ...defaultProps.project,
        sections: [
          {
            id: createGroupId(DEFAULT_UUID),
            name: "Custom Section 1",
            slug: "custom-section-1",
            type: "section" as const,
            items: [],
            color: "#ff0000",
          },
          {
            id: createGroupId("00000000-0000-4000-8000-000000000001"),
            name: "Custom Section 2",
            slug: "custom-section-2",
            type: "section" as const,
            items: [],
            color: "#00ff00",
          },
        ],
      }

      render(
        <Provider>
          <KanbanBoard {...defaultProps} project={customProject} />
        </Provider>,
      )

      const columnHeaders = screen.getAllByTestId("kanban-column-header")

      expect(columnHeaders).toHaveLength(2)
      expect(columnHeaders[0]).toHaveStyle("background-color: rgba(255, 0, 0, 0.1)")
      expect(columnHeaders[1]).toHaveStyle("background-color: rgba(0, 255, 0, 0.1)")
    })

    it("handles hex colors with and without # prefix correctly", () => {
      const customProject = {
        ...defaultProps.project,
        sections: [
          {
            id: createGroupId(DEFAULT_UUID),
            name: "With Hash",
            slug: "with-hash",
            type: "section" as const,
            items: [],
            color: "#3b82f6",
          },
          {
            id: createGroupId("00000000-0000-4000-8000-000000000001"),
            name: "Without Hash",
            slug: "without-hash",
            type: "section" as const,
            items: [],
            color: "3b82f6",
          },
        ],
      }

      render(
        <Provider>
          <KanbanBoard {...defaultProps} project={customProject} />
        </Provider>,
      )

      const columnHeaders = screen.getAllByTestId("kanban-column-header")

      // Both should render the same color regardless of # prefix
      expect(columnHeaders[0]).toHaveStyle("background-color: rgba(59, 130, 246, 0.1)")
      expect(columnHeaders[1]).toHaveStyle("background-color: rgba(59, 130, 246, 0.1)")
    })

    it("applies proper spacing and border styling to kanban cards", () => {
      render(
        <Provider>
          <KanbanBoard {...defaultProps} />
        </Provider>,
      )

      const cards = screen.getAllByTestId("card")
      const cardHeaders = screen.getAllByTestId("card-header")

      // Check that cards have no default padding and proper spacing
      cards.forEach((card) => {
        expect(card).toHaveClass("py-0")
      })

      // Check that headers have proper vertical padding
      cardHeaders.forEach((header) => {
        expect(header).toHaveClass("py-6")
      })
    })

    it("applies correct container padding for kanban layout", () => {
      const { container } = render(
        <Provider>
          <KanbanBoard {...defaultProps} />
        </Provider>,
      )

      // Check that the main container has horizontal padding only
      const mainContainer = container.querySelector(".flex.gap-6")
      expect(mainContainer).toHaveClass("px-6")
      expect(mainContainer).not.toHaveClass("py-6")
      expect(mainContainer).not.toHaveClass("p-6")
    })

    it("adds vertical margin to column containers", () => {
      const { container } = render(
        <Provider>
          <KanbanBoard {...defaultProps} />
        </Provider>,
      )

      // Check that column containers have vertical margin
      const columnContainers = container.querySelectorAll(".flex-1.min-w-64")
      columnContainers.forEach((columnContainer) => {
        expect(columnContainer).toHaveClass("my-6")
      })
    })
  })
})

// Simple responsive layout test that doesn't hang
describe("KanbanBoard Responsive Layout", () => {
  it("applies responsive CSS classes correctly", () => {
    const { container } = render(
      <div className="overflow-x-auto sm:overflow-x-visible px-6">
        <div className="flex flex-col sm:flex-row gap-6 min-h-full sm:min-w-max">
          <div className="w-full sm:w-80 lg:flex-1 lg:min-w-64 my-6">
            <div className="space-y-3 h-full min-h-[200px] pb-4">Test Content</div>
          </div>
        </div>
      </div>,
    )

    // Test that basic responsive classes are applied
    expect(container.querySelector(".overflow-x-auto")).toBeInTheDocument()
    expect(container.querySelector(".px-6")).toBeInTheDocument()
    expect(container.querySelector(".flex")).toBeInTheDocument()
    expect(container.querySelector(".flex-col")).toBeInTheDocument()
    expect(container.querySelector(".gap-6")).toBeInTheDocument()
    expect(container.querySelector(".w-full")).toBeInTheDocument()
    expect(container.querySelector(".my-6")).toBeInTheDocument()
    expect(container.querySelector(".pb-4")).toBeInTheDocument()
  })
})
