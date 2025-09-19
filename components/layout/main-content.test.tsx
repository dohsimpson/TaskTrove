import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { VoiceCommand } from "@/lib/types"

// Mock atoms to avoid complex setup - use complete module mock
vi.mock("jotai", () => {
  const createMockAtom = () => {
    const atom = () => null
    atom.debugLabel = ""
    return atom
  }

  return {
    useAtomValue: vi.fn(),
    useSetAtom: vi.fn(() => vi.fn()),
    atom: createMockAtom,
  }
})

// Mock all the imported components
vi.mock("@/components/task/project-sections-view", () => ({
  ProjectSectionsView: ({
    supportsSections,
    droppableId,
  }: {
    supportsSections: boolean
    droppableId: string
  }) => (
    <div data-testid="project-sections-view">
      <div data-testid="supports-sections">{supportsSections ? "true" : "false"}</div>
      <div data-testid="droppable-id">{droppableId}</div>
    </div>
  ),
}))

vi.mock("@/components/views/kanban-board", () => ({
  KanbanBoard: ({
    tasks,
    onTaskClick,
  }: {
    tasks?: unknown[]
    onTaskClick?: (task: { id: string }) => void
  }) => (
    <div data-testid="kanban-board">
      <div data-testid="task-count">{tasks?.length || 0}</div>
      <button onClick={() => onTaskClick?.({ id: "test-task" })}>Click Task</button>
    </div>
  ),
}))

vi.mock("@/components/views/calendar-view", () => ({
  CalendarView: ({
    tasks,
    onTaskClick,
    onDateClick,
    droppableId,
  }: {
    tasks?: unknown[]
    onTaskClick?: (task: { id: string }) => void
    onDateClick?: (date: Date) => void
    droppableId?: string
  }) => (
    <div data-testid="calendar-view">
      <div data-testid="task-count">{tasks?.length || 0}</div>
      <div data-testid="droppable-id">{droppableId}</div>
      <button onClick={() => onTaskClick?.({ id: "test-task" })}>Click Task</button>
      <button onClick={() => onDateClick?.(new Date())}>Click Date</button>
    </div>
  ),
}))

vi.mock("@/components/analytics/analytics-dashboard", () => ({
  AnalyticsDashboard: () => <div data-testid="analytics-dashboard">Analytics Dashboard</div>,
}))

vi.mock("@/components/task/task-empty-state", () => ({
  TaskEmptyState: ({
    title,
    description,
    action,
  }: {
    title?: string
    description?: string
    action?: { onClick: () => void; label: string }
  }) => (
    <div data-testid="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {action && <button onClick={action.onClick}>{action.label}</button>}
    </div>
  ),
}))

// Mock TaskItem since it depends on Jotai atoms
vi.mock("@/components/task/task-item", () => ({
  TaskItem: ({ taskId }: { taskId: string }) => (
    <div data-testid={`task-${taskId}`}>
      <div>Mock Task {taskId}</div>
      <div data-testid="flag-icon" />
      <div data-testid="calendar-icon" />
      <div data-testid="message-square-icon" />
      <div data-testid="paperclip-icon" />
    </div>
  ),
}))

// Mock SelectionToolbar
vi.mock("@/components/task/selection-toolbar", () => ({
  SelectionToolbar: () => <div data-testid="selection-toolbar" />,
}))

// Mock QuickCommentDialog
vi.mock("@/components/task/quick-comment-dialog", () => ({
  QuickCommentDialog: ({
    task,
    isOpen,
    onClose,
    onAddComment,
  }: {
    task?: { id: string }
    isOpen?: boolean
    onClose?: () => void
    onAddComment?: (taskId: string, comment: string) => void
  }) =>
    isOpen ? (
      <div data-testid="quick-comment-dialog">
        <div>Comment dialog for task {task?.id}</div>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onAddComment?.(task?.id || "", "test comment")}>Add Comment</button>
      </div>
    ) : null,
}))

// Mock TaskSchedulePopover
vi.mock("@/components/task/task-schedule-popover", () => ({
  TaskSchedulePopover: ({
    taskId,
    isOpen,
    onClose,
  }: {
    taskId?: string
    isOpen?: boolean
    onClose?: () => void
  }) =>
    isOpen ? (
      <div data-testid="task-schedule-popover">
        <div>Schedule popover for task {taskId}</div>
        <button onClick={onClose}>Close</button>
      </div>
    ) : null,
}))

// Import after mocking
import { MainContent } from "./main-content"
import { useAtomValue, useSetAtom } from "jotai"

const mockUseAtomValue = vi.mocked(useAtomValue)
const mockUseSetAtom = vi.mocked(useSetAtom)

interface MockMainContentProps {
  onVoiceCommand: (command: VoiceCommand) => void
}

describe("MainContent", () => {
  const defaultProps: MockMainContentProps = {
    onVoiceCommand: vi.fn(),
  }

  const setupMockAtoms = (
    currentView: string,
    viewMode: string = "list",
    additionalData: Record<string, unknown> = {},
  ) => {
    // Reset the mocks completely for each test
    mockUseAtomValue.mockReset()
    mockUseSetAtom.mockReset()

    // Set up useAtomValue mocks - based on the order in the component
    let atomValueCallIndex = 0
    const atomValues = [
      currentView, // currentViewAtom
      { viewMode, searchQuery: additionalData.searchQuery || "", showCompleted: false }, // currentViewStateAtom
      {
        pathname: "/",
        viewId: currentView,
        projectId: additionalData.projectId || "inbox-project-uuid-1234567890123456",
        labelName: additionalData.labelName || null,
        routeType: additionalData.routeType || "standard",
        routeParams: {},
      }, // currentRouteContextAtom
      additionalData.tasks || [], // filteredTasksAtom
      additionalData.projects || [], // allProjects
    ]

    mockUseAtomValue.mockImplementation(() => {
      const value = atomValues[atomValueCallIndex]
      atomValueCallIndex++
      return value
    })

    // Set up useSetAtom mocks - always return a mock function
    mockUseSetAtom.mockReturnValue(vi.fn())
  }

  it("renders main content container with default list view", () => {
    setupMockAtoms("inbox")
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("project-sections-view")).toBeInTheDocument()
  })

  it("renders analytics view correctly", () => {
    setupMockAtoms("analytics")
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("analytics-dashboard")).toBeInTheDocument()
    expect(screen.getByText("Analytics Dashboard")).toBeInTheDocument()
  })

  it("renders disabled voice commands view", () => {
    setupMockAtoms("voice")
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    expect(screen.getByText("Voice Commands")).toBeInTheDocument()
    expect(
      screen.getByText("Voice commands temporarily disabled during migration"),
    ).toBeInTheDocument()
  })

  it("renders disabled notifications view", () => {
    setupMockAtoms("notifications")
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    expect(screen.getByText("Notifications")).toBeInTheDocument()
    expect(
      screen.getByText("Notifications temporarily disabled during migration"),
    ).toBeInTheDocument()
  })

  it("renders disabled performance view", () => {
    setupMockAtoms("performance")
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("empty-state")).toBeInTheDocument()
    expect(screen.getByText("Performance Monitor")).toBeInTheDocument()
    expect(
      screen.getByText("Performance monitoring temporarily disabled during migration"),
    ).toBeInTheDocument()
  })

  it("renders kanban view mode correctly", () => {
    setupMockAtoms("inbox", "kanban", {
      tasks: [{ id: "task1" }, { id: "task2" }],
    })
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("kanban-board")).toBeInTheDocument()
    expect(screen.getByTestId("task-count")).toHaveTextContent("2")
  })

  it("renders calendar view mode correctly", () => {
    setupMockAtoms("today", "calendar", {
      tasks: [{ id: "task1" }],
    })
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("calendar-view")).toBeInTheDocument()
    expect(screen.getByTestId("task-count")).toHaveTextContent("1")
    expect(screen.getByTestId("droppable-id")).toHaveTextContent("task-list-today")
  })

  it("handles project view correctly", () => {
    setupMockAtoms("87654321-4321-4321-8321-210987654321", "list", {
      projectId: "123",
      projects: [{ id: "123", name: "Test Project" }],
      routeType: "project",
    })
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("project-sections-view")).toBeInTheDocument()
    expect(screen.getByTestId("supports-sections")).toHaveTextContent("true")
    expect(screen.getByTestId("droppable-id")).toHaveTextContent(
      "task-list-87654321-4321-4321-8321-210987654321",
    )
  })

  it("handles label view correctly", () => {
    setupMockAtoms("label-work", "list", {
      labelName: "work",
      routeType: "label",
    })
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("project-sections-view")).toBeInTheDocument()
    expect(screen.getByTestId("supports-sections")).toHaveTextContent("false")
    expect(screen.getByTestId("droppable-id")).toHaveTextContent("task-list-label-work")
  })

  it("handles voice command callback", () => {
    setupMockAtoms("inbox")
    const mockOnVoiceCommand = vi.fn()
    render(<MainContent onVoiceCommand={mockOnVoiceCommand} />)

    // Component should render and accept the callback
    expect(screen.getByTestId("project-sections-view")).toBeInTheDocument()
  })

  it("renders today view with proper droppable ID", () => {
    setupMockAtoms("today")
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("project-sections-view")).toBeInTheDocument()
    expect(screen.getByTestId("droppable-id")).toHaveTextContent("task-list-today")
  })

  it("renders upcoming view with proper droppable ID", () => {
    setupMockAtoms("upcoming")
    render(<MainContent {...defaultProps} />)

    expect(screen.getByTestId("project-sections-view")).toBeInTheDocument()
    expect(screen.getByTestId("droppable-id")).toHaveTextContent("task-list-upcoming")
  })
})
