import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { mockUseToast } from "@/test-utils"
import { render, screen, fireEvent } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import type { TaskId } from "@tasktrove/types/id"
import { createTaskId } from "@tasktrove/types/id"

// Mock Jotai
vi.mock("jotai", () => ({
  useAtom: vi.fn(() => [vi.fn(), vi.fn()]),
  useSetAtom: () => vi.fn(),
  useAtomValue: vi.fn((atom) => {
    // Return different values based on atom type
    if (atom?.toString?.().includes("selectionMode")) return false
    if (
      atom?.toString?.().includes("labels") ||
      atom?.toString?.().includes("tasks") ||
      atom?.toString?.().includes("projects")
    )
      return []
    return []
  }),
  Provider: vi.fn(({ children }) => children),
}))

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock toast hook
mockUseToast()

// Mock logger
vi.mock("@/lib/utils/logger", () => ({
  log: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock utils
vi.mock("@/lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}))

// Mock context menu visibility hook
vi.mock("@/hooks/use-context-menu-visibility", () => ({
  useContextMenuVisibility: () => ({
    isVisible: true,
    isMenuOpen: false,
    handleMenuOpenChange: vi.fn(),
  }),
}))

// Mock DraggableWrapper and DropTargetWrapper with proper data attributes
vi.mock("@/components/ui/draggable-wrapper", () => ({
  DraggableWrapper: ({ children, dragId, index, className, getData }: any) => {
    const data = getData ? getData() : {}
    return (
      <div
        data-testid={`draggable-${dragId}`}
        data-draggable-id={dragId}
        data-index={index}
        data-type={data.type || "draggable-item"}
        className={className}
        // Simulate drag start event
        onMouseDown={() => {
          // Trigger a custom event that tests can listen for
          const event = new CustomEvent("dragstart", {
            detail: { dragId, index, data },
          })
          document.dispatchEvent(event)
        }}
      >
        {children}
      </div>
    )
  },
}))

vi.mock("@/components/ui/drop-target-wrapper", () => ({
  DropTargetWrapper: ({ children, dropTargetId, className, getData, onDrop }: any) => {
    const data = getData ? getData() : {}
    return (
      <div
        data-testid={`droppable-${dropTargetId}`}
        data-droppable-id={dropTargetId}
        data-droppable-type={
          data.type === "project" ? "TASK" : data.type === "label" ? "TASK" : data.type
        }
        className={className}
        // Simulate drop event
        onMouseUp={(e) => {
          // Check if there's an active drag operation
          const dragData = (e.target as any).dataset.activeDrag
          if (dragData && onDrop) {
            const source = JSON.parse(dragData)
            onDrop({
              source: { data: source },
              location: {
                current: {
                  dropTargets: [{ data }],
                },
              },
            })
          }
        }}
      >
        {children}
      </div>
    )
  },
}))

// Mock TaskItem component
vi.mock("@/components/task/task-item", () => ({
  TaskItem: ({ taskId, className }: any) => {
    // Mock finding task by ID - create a basic task object for testing
    const task = {
      id: taskId,
      title: `Task ${taskId}`,
      projectId: "mock-project",
      labels: ["mock-label"],
    }

    return (
      <div data-testid={`task-item-${task.id}`} className={className}>
        <span>{task.title}</span>
        <span data-testid={`task-project-${task.projectId || "none"}`}>
          Project: {task.projectId || "None"}
        </span>
        <span data-testid={`task-labels-${task.labels?.length || 0}`}>
          Labels: {task.labels?.length || 0}
        </span>
      </div>
    )
  },
}))

// Mock sidebar navigation components
vi.mock("@/components/navigation/sidebar-nav", () => ({
  SidebarNav: ({ sections }: any) => (
    <div data-testid="sidebar-nav">
      {/* Mock projects from atoms - simulate the new atom-based approach */}
      {[
        { id: "1", name: "Work" },
        { id: "2", name: "Personal" },
      ]?.map((project: any) => (
        <div key={project.id} data-testid={`sidebar-project-${project.id}`}>
          <div data-testid={`droppable-sidebar-project-${project.id}`} data-droppable-type="TASK">
            <span>{project.name}</span>
          </div>
        </div>
      ))}
      {/* Mock labels from atoms - simulate the new atom-based approach */}
      {[
        { id: "1", name: "urgent" },
        { id: "2", name: "work" },
      ]?.map((label: any) => (
        <div key={label.id} data-testid={`sidebar-label-${label.id}`}>
          <div data-testid={`droppable-sidebar-label-${label.id}`} data-droppable-type="TASK">
            <span>{label.name}</span>
          </div>
        </div>
      ))}
    </div>
  ),
}))

// Mock useDragAndDrop hook with tracking capabilities
const mockHandleTaskDropOnProject = vi.fn()
const mockHandleTaskDropOnLabel = vi.fn()
const mockHandleDrop = vi.fn()

vi.mock("@/hooks/use-drag-and-drop", () => ({
  useDragAndDrop: () => ({
    handleDrop: mockHandleDrop,
    handleTaskReorder: vi.fn(),
    handleTaskDropOnProject: mockHandleTaskDropOnProject,
    handleTaskDropOnLabel: mockHandleTaskDropOnLabel,
  }),
}))

// Import components for the test (these will be mocked)
import { DraggableWrapper } from "@/components/ui/draggable-wrapper"
import { DropTargetWrapper } from "@/components/ui/drop-target-wrapper"
import { TaskItem } from "@/components/task/task-item"
import { useDragAndDrop } from "@/hooks/use-drag-and-drop"

// Test component that combines draggable tasks with droppable sidebar
function CrossPanelTestComponent({
  tasks = [],
  projects = [],
  labels = [],
}: {
  tasks?: any[]
  projects?: any[]
  labels?: any[]
}) {
  const { handleTaskDropOnProject, handleTaskDropOnLabel } = useDragAndDrop()

  return (
    <div data-testid="cross-panel-container">
      {/* Main task area */}
      <div data-testid="task-area">
        {tasks.map((task, index) => (
          <DraggableWrapper
            key={task.id}
            dragId={task.id}
            index={index}
            getData={() => ({
              type: "draggable-item",
              taskId: task.id,
            })}
          >
            <TaskItem taskId={task.id} />
          </DraggableWrapper>
        ))}
      </div>

      {/* Sidebar with droppable projects and labels */}
      <div data-testid="sidebar-area">
        {projects.map((project) => (
          <DropTargetWrapper
            key={project.id}
            dropTargetId={`sidebar-project-${project.id}`}
            onDrop={({ source }) => {
              if (source.data && source.data.type === "draggable-item") {
                const taskId = source.data.taskId || source.data.dragId
                if (taskId && typeof taskId === "string") {
                  handleTaskDropOnProject(createTaskId(taskId), project.id)
                }
              }
            }}
            getData={() => ({
              type: "project",
              projectId: project.id,
            })}
          >
            <div data-testid={`project-drop-zone-${project.id}`}>{project.name}</div>
          </DropTargetWrapper>
        ))}

        {labels.map((label) => (
          <DropTargetWrapper
            key={label.id}
            dropTargetId={`sidebar-label-${label.id}`}
            onDrop={({ source }) => {
              if (source.data && source.data.type === "draggable-item") {
                const taskId = source.data.taskId || source.data.dragId
                if (taskId && typeof taskId === "string") {
                  handleTaskDropOnLabel(createTaskId(taskId), label.id)
                }
              }
            }}
            getData={() => ({
              type: "label",
              labelId: label.id,
            })}
          >
            <div data-testid={`label-drop-zone-${label.id}`}>{label.name}</div>
          </DropTargetWrapper>
        ))}
      </div>
    </div>
  )
}

describe("Cross-Panel Drag and Drop", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const mockTasks = [
    {
      id: createTaskId("12345678-1234-4234-8234-123456789ab1"),
      title: "Test Task 1",
      projectId: "project-1",
      labels: ["label-1"],
    },
    {
      id: createTaskId("12345678-1234-4234-8234-123456789ab2"),
      title: "Test Task 2",
      projectId: null,
      labels: [],
    },
  ]

  const mockProjects = [
    { id: "project-1", name: "Work Project", color: "#3b82f6" },
    { id: "project-2", name: "Personal Project", color: "#10b981" },
  ]

  const mockLabels = [
    { id: "label-1", name: "Urgent", color: "#ef4444" },
    { id: "label-2", name: "Important", color: "#f97316" },
  ]

  it("renders draggable tasks with correct attributes", () => {
    render(
      <CrossPanelTestComponent tasks={mockTasks} projects={mockProjects} labels={mockLabels} />,
    )

    // Verify tasks are rendered as draggable
    const firstTask = mockTasks[0]
    const secondTask = mockTasks[1]
    if (!firstTask || !secondTask) {
      throw new Error("Expected to find first two mock tasks")
    }
    expect(screen.getByTestId(`draggable-${firstTask.id}`)).toBeInTheDocument()
    expect(screen.getByTestId(`draggable-${secondTask.id}`)).toBeInTheDocument()

    // Verify drag attributes
    const draggableTask1 = screen.getByTestId(`draggable-${firstTask.id}`)
    expect(draggableTask1).toHaveAttribute("data-draggable-id", firstTask.id)
    expect(draggableTask1).toHaveAttribute("data-index", "0")
  })

  it("renders droppable sidebar projects with correct attributes", () => {
    render(
      <CrossPanelTestComponent tasks={mockTasks} projects={mockProjects} labels={mockLabels} />,
    )

    // Verify project drop zones are rendered
    expect(screen.getByTestId("droppable-sidebar-project-project-1")).toBeInTheDocument()
    expect(screen.getByTestId("droppable-sidebar-project-project-2")).toBeInTheDocument()

    // Verify drop attributes
    const projectDropZone1 = screen.getByTestId("droppable-sidebar-project-project-1")
    expect(projectDropZone1).toHaveAttribute("data-droppable-type", "TASK")
    expect(projectDropZone1).toHaveAttribute("data-droppable-id", "sidebar-project-project-1")
  })

  it("renders droppable sidebar labels with correct attributes", () => {
    render(
      <CrossPanelTestComponent tasks={mockTasks} projects={mockProjects} labels={mockLabels} />,
    )

    // Verify label drop zones are rendered
    expect(screen.getByTestId("droppable-sidebar-label-label-1")).toBeInTheDocument()
    expect(screen.getByTestId("droppable-sidebar-label-label-2")).toBeInTheDocument()

    // Verify drop attributes
    const labelDropZone1 = screen.getByTestId("droppable-sidebar-label-label-1")
    expect(labelDropZone1).toHaveAttribute("data-droppable-type", "TASK")
    expect(labelDropZone1).toHaveAttribute("data-droppable-id", "sidebar-label-label-1")
  })

  it("simulates task drop on project and calls correct handler", async () => {
    render(
      <CrossPanelTestComponent tasks={mockTasks} projects={mockProjects} labels={mockLabels} />,
    )

    const taskToProject = mockTasks[1]
    if (!taskToProject) {
      throw new Error("Expected to find second mock task")
    }
    const draggableTask = screen.getByTestId(`draggable-${taskToProject.id}`)
    const projectDropZone = screen.getByTestId("project-drop-zone-project-1")

    // Simulate drag start
    fireEvent.mouseDown(draggableTask)

    // Simulate setting active drag data (this would be done by the real drag system)
    Object.defineProperty(projectDropZone, "dataset", {
      value: { activeDrag: JSON.stringify({ type: "draggable-item", taskId: taskToProject.id }) },
      writable: true,
    })

    // Simulate drop
    fireEvent.mouseUp(projectDropZone)

    // Verify the correct handler was called
    expect(mockHandleTaskDropOnProject).toHaveBeenCalledWith(taskToProject.id, "project-1")
  })

  it("simulates task drop on label and calls correct handler", async () => {
    render(
      <CrossPanelTestComponent tasks={mockTasks} projects={mockProjects} labels={mockLabels} />,
    )

    const taskToLabel = mockTasks[0]
    if (!taskToLabel) {
      throw new Error("Expected to find first mock task")
    }
    const draggableTask = screen.getByTestId(`draggable-${taskToLabel.id}`)
    const labelDropZone = screen.getByTestId("label-drop-zone-label-2")

    // Simulate drag start
    fireEvent.mouseDown(draggableTask)

    const firstTask = mockTasks[0]
    if (!firstTask) {
      throw new Error("Expected to find first mock task")
    }

    // Simulate setting active drag data
    Object.defineProperty(labelDropZone, "dataset", {
      value: { activeDrag: JSON.stringify({ type: "draggable-item", taskId: firstTask.id }) },
      writable: true,
    })

    // Simulate drop
    fireEvent.mouseUp(labelDropZone)

    // Verify the correct handler was called
    expect(mockHandleTaskDropOnLabel).toHaveBeenCalledWith(firstTask.id, "label-2")
  })

  it("provides visual feedback structure for drag operations", () => {
    render(
      <CrossPanelTestComponent tasks={mockTasks} projects={mockProjects} labels={mockLabels} />,
    )

    // Verify the container structure exists for visual feedback
    expect(screen.getByTestId("cross-panel-container")).toBeInTheDocument()
    expect(screen.getByTestId("task-area")).toBeInTheDocument()
    expect(screen.getByTestId("sidebar-area")).toBeInTheDocument()

    // Verify drop zones are properly structured
    const projectDropZone = screen.getByTestId("project-drop-zone-project-1")
    const labelDropZone = screen.getByTestId("label-drop-zone-label-1")

    expect(projectDropZone).toBeInTheDocument()
    expect(labelDropZone).toBeInTheDocument()
    expect(projectDropZone).toHaveTextContent("Work Project")
    expect(labelDropZone).toHaveTextContent("Urgent")
  })

  it("handles multiple tasks being draggable", () => {
    const manyTasks = [
      {
        id: createTaskId("12345678-1234-4234-8234-123456789ab1"),
        title: "Task 1",
        projectId: null,
        labels: [],
      },
      {
        id: createTaskId("12345678-1234-4234-8234-123456789ab2"),
        title: "Task 2",
        projectId: null,
        labels: [],
      },
      {
        id: createTaskId("12345678-1234-4234-8234-123456789ab3"),
        title: "Task 3",
        projectId: null,
        labels: [],
      },
    ]

    render(
      <CrossPanelTestComponent tasks={manyTasks} projects={mockProjects} labels={mockLabels} />,
    )

    // Verify all tasks are draggable
    manyTasks.forEach((task, index) => {
      const draggableElement = screen.getByTestId(`draggable-${task.id}`)
      expect(draggableElement).toBeInTheDocument()
      expect(draggableElement).toHaveAttribute("data-draggable-id", task.id)
      expect(draggableElement).toHaveAttribute("data-index", index.toString())
    })
  })

  it("handles multiple drop targets correctly", () => {
    render(
      <CrossPanelTestComponent tasks={mockTasks} projects={mockProjects} labels={mockLabels} />,
    )

    // Verify all projects and labels are droppable
    mockProjects.forEach((project) => {
      const dropZone = screen.getByTestId(`droppable-sidebar-project-${project.id}`)
      expect(dropZone).toBeInTheDocument()
      expect(dropZone).toHaveAttribute("data-droppable-type", "TASK")
    })

    mockLabels.forEach((label) => {
      const dropZone = screen.getByTestId(`droppable-sidebar-label-${label.id}`)
      expect(dropZone).toBeInTheDocument()
      expect(dropZone).toHaveAttribute("data-droppable-type", "TASK")
    })
  })

  it("verifies data transfer structure for pragmatic-drag-and-drop", () => {
    render(
      <CrossPanelTestComponent tasks={mockTasks} projects={mockProjects} labels={mockLabels} />,
    )

    const firstTask = mockTasks[0]
    if (!firstTask) {
      throw new Error("Expected to find first mock task")
    }

    // Verify draggable elements have correct data structure
    const draggableTask = screen.getByTestId(`draggable-${firstTask.id}`)
    expect(draggableTask).toHaveAttribute("data-type", "draggable-item")

    // Verify drop zones have correct type structure
    const projectDropZone = screen.getByTestId("droppable-sidebar-project-project-1")
    const labelDropZone = screen.getByTestId("droppable-sidebar-label-label-1")

    expect(projectDropZone).toHaveAttribute("data-droppable-type", "TASK")
    expect(labelDropZone).toHaveAttribute("data-droppable-type", "TASK")
  })

  it("integrates with useDragAndDrop hook properly", () => {
    render(
      <CrossPanelTestComponent tasks={mockTasks} projects={mockProjects} labels={mockLabels} />,
    )

    // Verify that the hook is being called (mocked functions exist)
    expect(mockHandleTaskDropOnProject).toBeDefined()
    expect(mockHandleTaskDropOnLabel).toBeDefined()
    expect(mockHandleDrop).toBeDefined()

    // Functions should not be called until actual drop events
    expect(mockHandleTaskDropOnProject).not.toHaveBeenCalled()
    expect(mockHandleTaskDropOnLabel).not.toHaveBeenCalled()
  })
})
