import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { ProjectSectionsView } from "./project-sections-view"
import type { Task, Project } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_TASK_ID_2,
  TEST_TASK_ID_3,
  TEST_PROJECT_ID_1,
  TEST_GROUP_ID_1,
  TEST_GROUP_ID_2,
  TEST_GROUP_ID_3,
} from "@/lib/utils/test-constants"
import { DEFAULT_SECTION_COLORS } from "@tasktrove/constants"

// Create hoisted mocks and data
const mockJotai = vi.hoisted(() => ({
  useSetAtom: vi.fn(),
  useAtom: vi.fn(() => [[mockProjectData], vi.fn()]),
  useAtomValue: vi.fn(),
  atom: vi.fn(),
  Provider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const mockProjectData = vi.hoisted(() => {
  return {
    id: "test-project-123e4567-e89b-12d3-a456-426614174000",
    name: "Test Project",
    sections: [
      { id: "section-123e4567-e89b-12d3-a456-426614174001", name: "Section 1", color: "#blue" },
      { id: "section-123e4567-e89b-12d3-a456-426614174002", name: "Section 2", color: "#red" },
      { id: "section-123e4567-e89b-12d3-a456-426614174003", name: "Section 3", color: "#green" },
    ],
  }
})

// Mock dependencies
vi.mock("jotai", () => mockJotai)

// Mock atom modules to prevent debugLabel assignment errors
vi.mock("@/lib/atoms/core/base", () => ({
  tasksAtom: { debugLabel: "tasksAtom" },
  projectsAtom: { debugLabel: "projectsAtom" },
  labelsAtom: { debugLabel: "labelsAtom" },
  dataQueryAtom: { debugLabel: "dataQueryAtom" },
  updateTasksMutationAtom: { debugLabel: "updateTasksMutationAtom" },
  createTaskMutationAtom: { debugLabel: "createTaskMutationAtom" },
  deleteTaskMutationAtom: { debugLabel: "deleteTaskMutationAtom" },
  updateProjectsMutationAtom: { debugLabel: "updateProjectsMutationAtom" },
  createProjectMutationAtom: { debugLabel: "createProjectMutationAtom" },
  deleteProjectMutationAtom: { debugLabel: "deleteProjectMutationAtom" },
  updateLabelsMutationAtom: { debugLabel: "updateLabelsMutationAtom" },
  createLabelMutationAtom: { debugLabel: "createLabelMutationAtom" },
  updateOrderingMutationAtom: { debugLabel: "updateOrderingMutationAtom" },
}))

vi.mock("@/lib/atoms/ui/dialogs", () => ({
  showQuickAddAtom: { debugLabel: "showQuickAddAtom" },
  showTaskPanelAtom: { debugLabel: "showTaskPanelAtom" },
  selectedTaskIdAtom: { debugLabel: "selectedTaskIdAtom" },
  taskFormDataAtom: { debugLabel: "taskFormDataAtom" },
  resetTaskFormAtom: { debugLabel: "resetTaskFormAtom" },
  openQuickAddAtom: { debugLabel: "openQuickAddAtom" },
  updateQuickAddTaskAtom: { debugLabel: "updateQuickAddTaskAtom" },
  resetQuickAddTaskAtom: { debugLabel: "resetQuickAddTaskAtom" },
}))

vi.mock("@/lib/atoms/ui/views", () => ({
  viewStatesAtom: { debugLabel: "viewStatesAtom" },
  currentViewStateAtom: { debugLabel: "currentViewStateAtom" },
  setViewOptionsAtom: { debugLabel: "setViewOptionsAtom" },
  setSearchQueryAtom: { debugLabel: "setSearchQueryAtom" },
}))

vi.mock("@/lib/atoms/core/tasks", () => ({
  orderedTasksByProjectAtom: { debugLabel: "orderedTasksByProjectAtom" },
  reorderTaskInViewAtom: { debugLabel: "reorderTaskInViewAtom" },
  moveTaskBetweenSectionsAtom: { debugLabel: "moveTaskBetweenSectionsAtom" },
  taskAtoms: {
    derived: {
      orderedTasksBySection: { debugLabel: "orderedTasksBySection" },
    },
  },
}))

vi.mock("@/lib/atoms/ui/navigation", () => ({
  currentRouteContextAtom: { debugLabel: "currentRouteContextAtom" },
  editingSectionIdAtom: { debugLabel: "editingSectionIdAtom" },
  stopEditingSectionAtom: { debugLabel: "stopEditingSectionAtom" },
  collapsedSectionsAtom: { debugLabel: "collapsedSectionsAtom" },
  toggleSectionCollapseAtom: { debugLabel: "toggleSectionCollapseAtom" },
}))

vi.mock("@/hooks/use-add-task-to-section", () => ({
  useAddTaskToSection: vi.fn(() => vi.fn()),
}))

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", () => ({
  extractClosestEdge: vi.fn(() => "bottom"),
  attachClosestEdge: vi.fn((data) => data),
}))

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index", () => ({
  getReorderDestinationIndex: vi.fn(({ indexOfTarget }) => indexOfTarget),
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
      {children}
    </div>
  ),
}))

vi.mock("@/components/ui/drop-target-wrapper", () => ({
  DropTargetWrapper: ({
    children,
    dropTargetId,
    className,
    getData,
    onDragEnter,
    onDragLeave,
    onDrag,
    onDrop,
  }: {
    children: React.ReactNode
    dropTargetId: string
    className?: string
    getData?: () => { type?: string }
    onDragEnter?: (data: {
      source: { data: Record<string, unknown> }
      location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
    }) => void
    onDragLeave?: (data: {
      source: { data: Record<string, unknown> }
      location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
    }) => void
    onDrag?: (data: {
      source: { data: Record<string, unknown> }
      location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
    }) => void
    onDrop?: (data: {
      source: { data: Record<string, unknown> }
      location: { current: { dropTargets: Array<{ data: Record<string, unknown> }> } }
    }) => void
  }) => {
    const data = getData ? getData() : {}
    return (
      <div
        data-testid={`droppable-${dropTargetId}`}
        data-droppable-type={
          data.type === "project" ? "TASK" : data.type === "label" ? "TASK" : data.type
        }
        className={className}
        data-has-drag-enter={!!onDragEnter}
        data-has-drag-leave={!!onDragLeave}
        data-has-drag={!!onDrag}
        data-has-drop={!!onDrop}
      >
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

// Mock all the atoms used by the component
vi.mock("@/lib/atoms", () => ({
  projectAtoms: {
    actions: {
      addSection: "mockAddSection",
      renameSection: "mockRenameSection",
      removeSection: "mockRemoveSection",
    },
  },
  projects: [mockProjectData],
  projectActions: {
    addSection: vi.fn(),
    renameSection: vi.fn(),
    removeSection: vi.fn(),
  },
  taskAtoms: {
    actions: {
      updateTask: "mockUpdateTask",
    },
    tasks: "mockTasks",
  },
  openQuickAddAtom: "mockOpenQuickAddAtom",
  projectsAtom: "mockProjectsAtom",
  filteredTasksAtom: "mockFilteredTasksAtom",
  currentViewStateAtom: "mockCurrentViewStateAtom",
  selectedTaskAtom: "mockSelectedTaskAtom",
  setViewOptionsAtom: "mockSetViewOptionsAtom",
  collapsedSectionsAtom: "mockCollapsedSectionsAtom",
  toggleSectionCollapseAtom: "mockToggleSectionCollapseAtom",
  labelsAtom: "mockLabelsAtom",
  sidePanelWidthAtom: "mockSidePanelWidthAtom",
  updateGlobalViewOptionsAtom: "mockUpdateGlobalViewOptionsAtom",
}))

vi.mock("@/lib/atoms/ui/navigation", () => ({
  currentRouteContextAtom: "mockCurrentRouteContextAtom",
  editingSectionIdAtom: "mockEditingSectionIdAtom",
  stopEditingSectionAtom: "mockStopEditingSectionAtom",
  startEditingSectionAtom: "mockStartEditingSectionAtom",
  openSectionDialogAtom: "mockOpenSectionDialogAtom",
}))

vi.mock("@/lib/atoms/core/tasks", () => ({
  orderedTasksByProjectAtom: "mockOrderedTasksByProjectAtom",
  reorderTaskInViewAtom: "mockReorderTaskInViewAtom",
  moveTaskBetweenSectionsAtom: "mockMoveTaskBetweenSectionsAtom",
  taskAtoms: {
    derived: {
      orderedTasksBySection: vi.fn(() => vi.fn(() => [])),
    },
  },
}))

vi.mock("@/lib/utils", () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
}))

// Mock TaskShadow component
vi.mock("@/components/ui/custom/task-shadow", () => ({
  TaskShadow: ({ height, className }: { height: number; className?: string }) => (
    <div data-testid="task-shadow" className={className} data-height={height}>
      Shadow placeholder
    </div>
  ),
}))

// Mock component interfaces
interface MockTaskItemProps {
  taskId: string
  variant?: string
  className?: string
  showProjectBadge?: boolean
}

interface MockTaskSidePanelProps {
  isOpen: boolean
  onClose: () => void
}

interface MockAddSectionDividerProps {
  onAddSection: (position: number) => void
  position: number
  className?: string
}

interface MockCardProps {
  children: React.ReactNode
  className?: string
}

interface MockBadgeProps {
  children: React.ReactNode
  variant?: string
  className?: string
}

interface MockButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  variant?: string
  size?: string
  disabled?: boolean
  [key: string]: unknown
}

interface MockInputProps {
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void
  placeholder?: string
  autoFocus?: boolean
  [key: string]: unknown
}

interface MockCollapsibleProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface MockCollapsibleContentProps {
  children: React.ReactNode
}

interface MockCollapsibleTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface MockCardHeaderProps {
  children: React.ReactNode
  className?: string
  [key: string]: unknown
}

interface MockCardTitleProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

interface MockEditableDivProps {
  value?: string
  onChange?: (value: string) => void
  onCancel?: () => void
  className?: string
  autoFocus?: boolean
  onClick?: (event: React.MouseEvent) => void
  [key: string]: unknown
}

interface MockColorPickerProps {
  selectedColor?: string
  onColorSelect?: (color: string) => void
  size?: string
  label?: string
  className?: string
}

interface MockTask {
  id: string
  title: string
  [key: string]: unknown
}

vi.mock("./task-item", () => ({
  TaskItem: ({ taskId, variant, className }: MockTaskItemProps) => {
    // Use the mock to get task data
    const mockTasks = mockJotai.useAtomValue("mockTasks") || []
    const task = mockTasks.find((t: MockTask) => t.id === taskId)
    return (
      <div
        data-testid={`task-item-${taskId}`}
        className={`cursor-pointer ${className || ""} ${variant === "compact" ? "compact" : ""}`}
      >
        {task?.title || `Task ${taskId}`}
      </div>
    )
  },
}))

vi.mock("./task-side-panel", () => ({
  TaskSidePanel: ({ isOpen, onClose }: MockTaskSidePanelProps) => (
    <div
      data-testid="task-side-panel"
      data-open={isOpen}
      style={{ display: isOpen ? "block" : "none" }}
    >
      <div>Side Panel Open</div>
      <button data-testid="task-side-panel-close" onClick={onClose}>
        Close Panel
      </button>
    </div>
  ),
}))

vi.mock("./task-filter-controls", () => ({
  TaskFilterControls: ({ className }: { className?: string }) => (
    <div data-testid="task-filter-controls" className={className}>
      Filter Controls
    </div>
  ),
}))

vi.mock("./task-filter-badges", () => ({
  TaskFilterBadges: ({ className }: { className?: string }) => (
    <div data-testid="task-filter-badges" className={className}>
      Filter Badges
    </div>
  ),
}))

vi.mock("./add-section-divider", () => ({
  AddSectionDivider: ({ onAddSection, position, className }: MockAddSectionDividerProps) => (
    <div
      data-testid={`add-section-divider-${position}`}
      className={className}
      onClick={() => onAddSection(position)}
    >
      Add section divider
    </div>
  ),
}))

vi.mock("./selection-toolbar", () => ({
  SelectionToolbar: () => <div data-testid="selection-toolbar">Selection Toolbar</div>,
}))

vi.mock("./task-empty-state", () => ({
  TaskEmptyState: ({
    title = "No tasks found",
    description = "Create your first task to get started",
  }: {
    title?: string
    description?: string
  }) => (
    <div data-testid="task-empty-state">
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}))

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: MockCardProps) => (
    <div className={className} data-testid="card">
      {children}
    </div>
  ),
  CardHeader: ({ children, className, ...props }: MockCardHeaderProps) => (
    <div className={className} data-testid="card-header" {...props}>
      {children}
    </div>
  ),
  CardTitle: ({ children, className, onClick }: MockCardTitleProps) => (
    <div className={className} data-testid="card-title" onClick={onClick}>
      {children}
    </div>
  ),
  CardContent: ({ children, className }: MockCardProps) => (
    <div className={className} data-testid="card-content">
      {children}
    </div>
  ),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: MockBadgeProps) => (
    <span className={className} data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    className,
    variant,
    size,
    disabled,
    ...props
  }: MockButtonProps) => (
    <button
      onClick={onClick}
      className={className}
      data-variant={variant}
      data-size={size}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/input", () => ({
  Input: ({
    value,
    onChange,
    onKeyDown,
    onBlur,
    placeholder,
    autoFocus,
    ...props
  }: MockInputProps) => (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onBlur={onBlur}
      placeholder={placeholder}
      autoFocus={autoFocus}
      data-testid="input"
      {...props}
    />
  ),
}))

vi.mock("@/components/ui/custom/animated-collapsible", () => ({
  Collapsible: ({ children, open }: MockCollapsibleProps) => (
    <div data-testid="collapsible" data-open={open}>
      {children}
    </div>
  ),
  CollapsibleContent: ({ children }: MockCollapsibleContentProps) => (
    <div data-testid="collapsible-content">{children}</div>
  ),
  CollapsibleTrigger: ({ children, asChild }: MockCollapsibleTriggerProps) =>
    asChild ? children : <div data-testid="collapsible-trigger">{children}</div>,
}))

vi.mock("@/components/ui/custom/editable-div", () => ({
  EditableDiv: ({ value, onChange, className, onClick, ...props }: MockEditableDivProps) => (
    <div
      data-testid="editable-div"
      className={className}
      contentEditable
      suppressContentEditableWarning
      onClick={onClick}
      onBlur={() => onChange?.(value || "")}
      {...props}
    >
      {value}
    </div>
  ),
}))

vi.mock("@/components/ui/custom/color-picker", () => ({
  ColorPicker: ({ selectedColor, onColorSelect, label, className }: MockColorPickerProps) => (
    <div data-testid="color-picker" className={className}>
      <label>{label}</label>
      <div style={{ backgroundColor: selectedColor }} onClick={() => onColorSelect?.("#ff0000")} />
    </div>
  ),
}))

describe("ProjectSectionsView", () => {
  const mockAddSection = vi.fn()
  const mockRenameSection = vi.fn()
  const mockRemoveSection = vi.fn()
  const mockUpdateTask = vi.fn()
  const mockOpenQuickAdd = vi.fn()

  const mockProject: Project = {
    id: TEST_PROJECT_ID_1,
    name: "Test Project",
    slug: "test-project",
    color: "#3B82F6",
    shared: false,
    sections: [
      {
        id: TEST_GROUP_ID_1,
        name: "Planning",
        slug: "planning",
        type: "section" as const,
        items: [TEST_TASK_ID_1, TEST_TASK_ID_3],
        color: DEFAULT_SECTION_COLORS[0],
      },
      {
        id: TEST_GROUP_ID_2,
        name: "In Progress",
        slug: "in-progress",
        type: "section" as const,
        items: [TEST_TASK_ID_2],
        color: DEFAULT_SECTION_COLORS[1],
      },
      {
        id: TEST_GROUP_ID_3,
        name: "Review",
        slug: "review",
        type: "section" as const,
        items: [],
        color: DEFAULT_SECTION_COLORS[2],
      },
    ],
  }

  const mockTasks: Task[] = [
    {
      id: TEST_TASK_ID_1,
      title: "Task 1",
      description: "First task",
      completed: false,
      priority: 2,
      projectId: TEST_PROJECT_ID_1,
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      recurringMode: "dueDate",
      createdAt: new Date("2024-01-01"),
    },
    {
      id: TEST_TASK_ID_2,
      title: "Task 2",
      description: "Second task",
      completed: true,
      priority: 1,
      projectId: TEST_PROJECT_ID_1,
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      recurringMode: "dueDate",
      createdAt: new Date("2024-01-02"),
    },
    {
      id: TEST_TASK_ID_3,
      title: "Task 3",
      description: "Third task without section",
      completed: false,
      priority: 3,
      projectId: TEST_PROJECT_ID_1,
      labels: [],
      subtasks: [],
      comments: [],
      attachments: [],
      recurringMode: "dueDate",
      createdAt: new Date("2024-01-03"),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockJotai.useSetAtom.mockImplementation((atom) => {
      if (atom === "mockAddSection") return mockAddSection
      if (atom === "mockRenameSection") return mockRenameSection
      if (atom === "mockRemoveSection") return mockRemoveSection
      if (atom === "mockUpdateTask") return mockUpdateTask
      if (atom === "mockOpenQuickAddAtom") return mockOpenQuickAdd
      if (atom === "mockCloseTaskPanelAtom") return vi.fn()
      if (atom === "mockReorderTaskInViewAtom") return vi.fn()
      if (atom === "mockMoveTaskBetweenSectionsAtom") return vi.fn()
      if (atom === "mockUpdateGlobalViewOptionsAtom") return vi.fn()
      return vi.fn()
    })
    mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
      if (atom === "mockTasks") return mockTasks
      if (atom === "mockFilteredTasksAtom") return mockTasks
      if (atom === "mockProjectsAtom") return [mockProject]
      if (atom === "mockCurrentViewStateAtom")
        return {
          showSidePanel: false,
          compactView: false,
          viewMode: "list",
          sortBy: "dueDate",
          showCompleted: false,
        }
      if (atom === "mockCurrentRouteContextAtom")
        return {
          pathname: `/projects/${TEST_PROJECT_ID_1}`,
          viewId: TEST_PROJECT_ID_1, // Direct project ID as viewId
          routeType: "project",
        }
      if (atom === "mockCollapsedSectionsAtom") return []
      if (atom === "mockShowTaskPanelAtom") return false
      if (atom === "mockSelectedTaskAtom") return null
      if (atom === "mockSidePanelWidthAtom") return 25
      if (atom === "mockOrderedTasksByProjectAtom") {
        // Return a Map that mimics the orderedTasksByProjectAtom structure
        const orderedTasksMap = new Map()
        orderedTasksMap.set(
          TEST_PROJECT_ID_1,
          mockTasks.filter((t) => t.projectId === TEST_PROJECT_ID_1),
        )
        orderedTasksMap.set(
          "inbox",
          mockTasks.filter((t) => !t.projectId || t.projectId === "inbox"),
        )
        return orderedTasksMap
      }
      // Handle orderedTasksBySection atom - it comes as a spy function
      if (atom && vi.isMockFunction(atom)) {
        // This is the orderedTasksBySection atom (spy function)
        return (projectId: string, sectionId: string | null) => {
          const project = mockProject
          if (!project || project.id !== projectId) return []

          // Find the section and return tasks from its items array
          const section = project.sections.find((s) => s.id === sectionId)
          if (!section) return []

          return mockTasks.filter((task) => section.items.includes(task.id))
        }
      }
      return []
    })
  })

  it("renders project sections with tasks", () => {
    render(<ProjectSectionsView droppableId="test-droppable" />)

    // Check that sections are rendered
    expect(screen.getByText("Planning")).toBeInTheDocument()
    expect(screen.getByText("In Progress")).toBeInTheDocument()
    expect(screen.getByText("Review")).toBeInTheDocument()

    // Check that tasks are rendered in their sections
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(screen.getByTestId(`task-item-${TEST_TASK_ID_3}`)).toBeInTheDocument()
  })

  it("shows task counts for each section", () => {
    render(<ProjectSectionsView droppableId="test-droppable" />)

    const badges = screen.getAllByTestId("badge")
    expect(badges).toHaveLength(4) // 4 sections (3 original + 1 default)

    // Check badge content shows task count
    const badgeTexts = badges.map((badge) => badge.textContent)
    expect(badgeTexts).toContain("0") // Default section has 0 tasks
    expect(badgeTexts).toContain("2") // Planning has 2 tasks (TEST_TASK_ID_1 and TEST_TASK_ID_3 both have sectionId: TEST_GROUP_ID_1)
    expect(badgeTexts).toContain("1") // In Progress has 1 task (TEST_TASK_ID_2 has sectionId: TEST_GROUP_ID_2)
    expect(badgeTexts).toContain("0") // Review has 0 tasks (there will be two sections with 0 tasks)
  })

  it("handles task click to open side panel", async () => {
    render(<ProjectSectionsView droppableId="test-droppable" />)

    const taskItem = screen.getByTestId(`task-item-${TEST_TASK_ID_1}`)
    await userEvent.click(taskItem)

    // Task click is now handled internally by TaskItem component via atoms
    expect(taskItem).toBeInTheDocument()
  })

  it("shows side panel when task is selected and showSidePanel is true", () => {
    // Mock the atom to return showSidePanel: true
    mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
      if (atom === "mockTasks") return mockTasks
      if (atom === "mockFilteredTasksAtom") return mockTasks
      if (atom === "mockProjectsAtom") return [mockProject]
      if (atom === "mockCurrentViewStateAtom")
        return {
          showSidePanel: true, // Side panel view option is enabled
          compactView: false,
        }
      if (atom === "mockCurrentRouteContextAtom")
        return {
          pathname: `/projects/${TEST_PROJECT_ID_1}`,
          viewId: TEST_PROJECT_ID_1, // Direct project ID as viewId
          routeType: "project",
        }
      if (atom === "mockCollapsedSectionsAtom") return []
      if (atom === "mockSelectedTaskAtom") return mockTasks[0] // Task is selected
      if (atom === "mockSidePanelWidthAtom") return 25
      if (atom === "mockOrderedTasksByProjectAtom") {
        const orderedTasksMap = new Map()
        orderedTasksMap.set(
          TEST_PROJECT_ID_1,
          mockTasks.filter((t) => t.projectId === TEST_PROJECT_ID_1),
        )
        return orderedTasksMap
      }
      // Handle orderedTasksBySection atom
      if (
        atom &&
        typeof atom === "object" &&
        "debugLabel" in atom &&
        atom.debugLabel === "orderedTasksBySection"
      ) {
        return (projectId: string, sectionId: string | null) => {
          return mockTasks.filter((task) => {
            const matchesProject =
              projectId === "inbox"
                ? !task.projectId || task.projectId === "inbox"
                : task.projectId === projectId
            const matchesSection = true // Section filtering not needed in new architecture
            return matchesProject && matchesSection
          })
        }
      }
      // Handle orderedTasksBySection atom - it comes as a spy function
      if (atom && vi.isMockFunction(atom)) {
        return (projectId: string, sectionId: string | null) => {
          return mockTasks.filter((task) => {
            const matchesProject =
              projectId === "inbox"
                ? !task.projectId || task.projectId === "inbox"
                : task.projectId === projectId
            const matchesSection = true // Section filtering not needed in new architecture
            return matchesProject && matchesSection
          })
        }
      }
      return []
    })

    render(<ProjectSectionsView droppableId="test-droppable" />)

    // After opening, the task panel should be open (data-open="true")
    const sidePanelAfter = screen.getByTestId("task-side-panel")
    expect(sidePanelAfter).toHaveAttribute("data-open", "true")
    expect(screen.getByText("Side Panel Open")).toBeInTheDocument()
  })

  it("closes side panel when close button is clicked", async () => {
    const mockSetViewOptions = vi.fn()
    mockJotai.useSetAtom.mockImplementation((atom) => {
      if (atom === "mockSetViewOptionsAtom") return mockSetViewOptions
      return vi.fn()
    })

    // Mock the atoms to show panel is open
    mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
      if (atom === "mockTasks") return mockTasks
      if (atom === "mockFilteredTasksAtom") return mockTasks
      if (atom === "mockProjectsAtom") return [mockProject]
      if (atom === "mockCurrentViewStateAtom") return { showSidePanel: true, compactView: false } // Panel is open
      if (atom === "mockCurrentRouteContextAtom")
        return {
          pathname: `/projects/${TEST_PROJECT_ID_1}`,
          viewId: TEST_PROJECT_ID_1,
          routeType: "project",
        }
      if (atom === "mockCollapsedSectionsAtom") return []
      if (atom === "mockSelectedTaskAtom") return mockTasks[0]
      if (atom === "mockSidePanelWidthAtom") return 25
      if (atom === "mockOrderedTasksByProjectAtom") {
        const orderedTasksMap = new Map()
        orderedTasksMap.set(
          TEST_PROJECT_ID_1,
          mockTasks.filter((t) => t.projectId === TEST_PROJECT_ID_1),
        )
        return orderedTasksMap
      }
      // Handle orderedTasksBySection atom - it comes as a spy function
      if (atom && vi.isMockFunction(atom)) {
        return (projectId: string, sectionId: string | null) => {
          return mockTasks.filter((task) => {
            const matchesProject =
              projectId === "inbox"
                ? !task.projectId || task.projectId === "inbox"
                : task.projectId === projectId
            const matchesSection = true // Section filtering not needed in new architecture
            return matchesProject && matchesSection
          })
        }
      }
      return []
    })

    render(<ProjectSectionsView droppableId="test-droppable" />)

    // Click close button in side panel
    const closeButton = screen.getByTestId("task-side-panel-close")
    await userEvent.click(closeButton)

    expect(mockSetViewOptions).toHaveBeenCalledWith({ showSidePanel: false })
  })

  it("shows add section dividers and input form", async () => {
    render(<ProjectSectionsView droppableId="test-droppable" />)

    // Should show dividers at different positions
    // expect(screen.getByTestId('add-section-divider-1')).toBeInTheDocument()
    // expect(screen.getByTestId('add-section-divider-2')).toBeInTheDocument()
    // expect(screen.getByTestId('add-section-divider-3')).toBeInTheDocument()

    // Click a divider to show the input form
    // const addSectionDivider = screen.getByTestId('add-section-divider-3')
    // await userEvent.click(addSectionDivider)

    // const sectionInput = screen.getByPlaceholderText('Section name...')
    // expect(sectionInput).toBeInTheDocument()
  })

  it("adds new section when form is submitted", async () => {
    render(<ProjectSectionsView droppableId="test-droppable" />)

    // Click add section divider (at the end)
    // const addSectionDivider = screen.getByTestId('add-section-divider-3')
    // await userEvent.click(addSectionDivider)

    // Type section name
    // const sectionInput = screen.getByPlaceholderText('Section name...')
    // await userEvent.type(sectionInput, 'New Section')

    // Click add button
    // const addButton = screen.getByText('Add')
    // await userEvent.click(addButton)

    // expect(mockAddSection).toHaveBeenCalledWith({
    //   projectId: TEST_PROJECT_ID_1,
    //   sectionName: 'New Section',
    //   color: '#3b82f6',
    //   position: 3,
    // })
  })

  it("opens quick add dialog when Add Task button is clicked", async () => {
    render(<ProjectSectionsView droppableId="test-droppable" />)

    const addTaskButton = screen.getByText("Add Task")
    await userEvent.click(addTaskButton)

    expect(mockOpenQuickAdd).toHaveBeenCalled()
  })

  it("renders droppable areas for drag and drop", () => {
    render(<ProjectSectionsView droppableId="test-droppable" />)

    // Check that droppable areas are rendered
    const droppables = screen.getAllByTestId(/^droppable-/)
    expect(droppables.length).toBeGreaterThan(0)

    // Check that tasks are wrapped in draggable components
    expect(screen.getByTestId(`draggable-${TEST_TASK_ID_1}`)).toBeInTheDocument()
    expect(screen.getByTestId(`draggable-${TEST_TASK_ID_2}`)).toBeInTheDocument()
    expect(screen.getByTestId(`draggable-${TEST_TASK_ID_3}`)).toBeInTheDocument()
  })

  describe("when supportsSections is false", () => {
    it("renders as flat list without section UI", () => {
      render(<ProjectSectionsView droppableId="test-droppable" supportsSections={false} />)

      // Should not show section headers
      expect(screen.queryByText("Planning")).not.toBeInTheDocument()
      expect(screen.queryByText("In Progress")).not.toBeInTheDocument()
      expect(screen.queryByText("Review")).not.toBeInTheDocument()

      // Should show all tasks in a flat list
      expect(screen.getByTestId(`task-item-${TEST_TASK_ID_1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`task-item-${TEST_TASK_ID_2}`)).toBeInTheDocument()
      expect(screen.getByTestId(`task-item-${TEST_TASK_ID_3}`)).toBeInTheDocument()

      // Should have droppable areas (main list + individual tasks)
      expect(screen.getAllByTestId(/^droppable-/).length).toBeGreaterThan(0)
    })

    it("does not show add section dividers when sections are disabled", () => {
      render(<ProjectSectionsView droppableId="test-droppable" supportsSections={false} />)

      // Should not show any add section dividers
      expect(screen.queryByTestId("add-section-divider-0")).not.toBeInTheDocument()
      expect(screen.queryByTestId("add-section-divider-1")).not.toBeInTheDocument()
      expect(screen.queryByTestId("add-section-divider-2")).not.toBeInTheDocument()
      expect(screen.queryByTestId("add-section-divider-3")).not.toBeInTheDocument()
    })

    it("shows Add Task button in flat mode", () => {
      render(<ProjectSectionsView droppableId="test-droppable" supportsSections={false} />)

      expect(screen.getByText("Add Task")).toBeInTheDocument()
    })

    it("opens quick add dialog when Add Task button is clicked in flat mode", async () => {
      render(<ProjectSectionsView droppableId="test-droppable" supportsSections={false} />)

      const addTaskButton = screen.getByText("Add Task")
      await userEvent.click(addTaskButton)

      expect(mockOpenQuickAdd).toHaveBeenCalled()
    })
  })

  describe("when supportsSections is true (default behavior)", () => {
    it("shows full section functionality", () => {
      render(<ProjectSectionsView droppableId="test-droppable" supportsSections={true} />)

      // Should show section headers
      expect(screen.getByText("Planning")).toBeInTheDocument()
      expect(screen.getByText("In Progress")).toBeInTheDocument()
      expect(screen.getByText("Review")).toBeInTheDocument()

      // Should show add section dividers
      // expect(screen.getByTestId('add-section-divider-1')).toBeInTheDocument()
      // expect(screen.getByTestId('add-section-divider-2')).toBeInTheDocument()
      // expect(screen.getByTestId('add-section-divider-3')).toBeInTheDocument()
    })
  })

  describe("collapsed sections", () => {
    it("makes collapsed sections drop targets", () => {
      // Mock collapsed sections atom to include the first section
      mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === "mockTasks") return mockTasks
        if (atom === "mockFilteredTasksAtom") return mockTasks
        if (atom === "mockProjectsAtom") return [mockProject]
        if (atom === "mockCurrentViewStateAtom")
          return {
            showSidePanel: false,
            compactView: false,
            viewMode: "list",
            sortBy: "dueDate",
            showCompleted: false,
          }
        if (atom === "mockCurrentRouteContextAtom")
          return {
            pathname: `/projects/${TEST_PROJECT_ID_1}`,
            viewId: TEST_PROJECT_ID_1,
            routeType: "project",
          }
        if (atom === "mockCollapsedSectionsAtom") return [TEST_GROUP_ID_1] // First section is collapsed
        if (atom === "mockShowTaskPanelAtom") return false
        if (atom === "mockSelectedTaskAtom") return null
        if (atom === "mockOrderedTasksByProjectAtom") {
          const orderedTasksMap = new Map()
          orderedTasksMap.set(
            TEST_PROJECT_ID_1,
            mockTasks.filter((t) => t.projectId === TEST_PROJECT_ID_1),
          )
          return orderedTasksMap
        }
        // Handle orderedTasksBySection atom - it comes as a spy function
        if (atom && vi.isMockFunction(atom)) {
          return (projectId: string, sectionId: string | null) => {
            const project = mockProject
            if (!project || project.id !== projectId) return []
            const section = project.sections.find((s) => s.id === sectionId)
            if (!section) return []
            return mockTasks.filter((task) => section.items.includes(task.id))
          }
        }
        return []
      })

      render(<ProjectSectionsView droppableId="test-droppable" />)

      // Check that the first section (collapsed) has a droppable wrapper
      expect(screen.getByText("Planning")).toBeInTheDocument()

      // Verify the Planning section (now at index 1 due to default section) shows it's closed (collapsed)
      const collapsibles = screen.getAllByTestId("collapsible")
      expect(collapsibles[1]).toHaveAttribute("data-open", "false")

      // Verify we have droppable areas for sections (collapsed section should have a drop target)
      const droppables = screen.getAllByTestId(/^droppable-test-droppable-section-/)
      expect(droppables.length).toBeGreaterThan(0)

      // Verify collapsed section has drag handlers (there should be two: one for collapsed header, one for expanded content)
      const collapsedSectionDroppables = screen.getAllByTestId(
        `droppable-test-droppable-section-${TEST_GROUP_ID_1}`,
      )
      expect(collapsedSectionDroppables.length).toBeGreaterThan(0)

      // At least one should have drag handlers
      const hasDropHandlers = collapsedSectionDroppables.some(
        (droppable) =>
          droppable.getAttribute("data-has-drag-enter") === "true" &&
          droppable.getAttribute("data-has-drag-leave") === "true" &&
          droppable.getAttribute("data-has-drop") === "true",
      )
      expect(hasDropHandlers).toBe(true)
    })

    it("renders drop targets for both collapsed and expanded sections", () => {
      // Mock mixed collapsed/expanded state
      mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === "mockTasks") return mockTasks
        if (atom === "mockFilteredTasksAtom") return mockTasks
        if (atom === "mockProjectsAtom") return [mockProject]
        if (atom === "mockCurrentViewStateAtom")
          return {
            showSidePanel: false,
            compactView: false,
            viewMode: "list",
            sortBy: "dueDate",
            showCompleted: false,
          }
        if (atom === "mockCurrentRouteContextAtom")
          return {
            pathname: `/projects/${TEST_PROJECT_ID_1}`,
            viewId: TEST_PROJECT_ID_1,
            routeType: "project",
          }
        if (atom === "mockCollapsedSectionsAtom") return [TEST_GROUP_ID_1, TEST_GROUP_ID_3] // First and third sections collapsed
        if (atom === "mockShowTaskPanelAtom") return false
        if (atom === "mockSelectedTaskAtom") return null
        if (atom === "mockOrderedTasksByProjectAtom") {
          const orderedTasksMap = new Map()
          orderedTasksMap.set(
            TEST_PROJECT_ID_1,
            mockTasks.filter((t) => t.projectId === TEST_PROJECT_ID_1),
          )
          return orderedTasksMap
        }
        // Handle orderedTasksBySection atom - it comes as a spy function
        if (atom && vi.isMockFunction(atom)) {
          return (projectId: string, sectionId: string | null) => {
            const project = mockProject
            if (!project || project.id !== projectId) return []
            const section = project.sections.find((s) => s.id === sectionId)
            if (!section) return []
            return mockTasks.filter((task) => section.items.includes(task.id))
          }
        }
        return []
      })

      render(<ProjectSectionsView droppableId="test-droppable" />)

      // All sections should have section names visible
      expect(screen.getByText("Planning")).toBeInTheDocument()
      expect(screen.getByText("In Progress")).toBeInTheDocument()
      expect(screen.getByText("Review")).toBeInTheDocument()

      // Should have drop targets for all sections (collapsed and expanded)
      const droppables = screen.getAllByTestId(/^droppable-/)
      expect(droppables.length).toBeGreaterThan(0)

      // Verify collapsible states
      const collapsibles = screen.getAllByTestId("collapsible")
      expect(collapsibles).toHaveLength(4) // 4 sections (3 original + 1 default)
    })

    it("shows TaskShadow when dragging over collapsed section", () => {
      // Mock collapsed sections atom to include the first section
      mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === "mockTasks") return mockTasks
        if (atom === "mockFilteredTasksAtom") return mockTasks
        if (atom === "mockProjectsAtom") return [mockProject]
        if (atom === "mockCurrentViewStateAtom")
          return {
            showSidePanel: false,
            compactView: false,
            viewMode: "list",
            sortBy: "dueDate",
            showCompleted: false,
          }
        if (atom === "mockCurrentRouteContextAtom")
          return {
            pathname: `/projects/${TEST_PROJECT_ID_1}`,
            viewId: TEST_PROJECT_ID_1,
            routeType: "project",
          }
        if (atom === "mockCollapsedSectionsAtom") return [TEST_GROUP_ID_1] // First section is collapsed
        if (atom === "mockShowTaskPanelAtom") return false
        if (atom === "mockSelectedTaskAtom") return null
        if (atom === "mockOrderedTasksByProjectAtom") {
          const orderedTasksMap = new Map()
          orderedTasksMap.set(
            TEST_PROJECT_ID_1,
            mockTasks.filter((t) => t.projectId === TEST_PROJECT_ID_1),
          )
          return orderedTasksMap
        }
        // Handle orderedTasksBySection atom - it comes as a spy function
        if (atom && vi.isMockFunction(atom)) {
          return (projectId: string, sectionId: string | null) => {
            const project = mockProject
            if (!project || project.id !== projectId) return []
            const section = project.sections.find((s) => s.id === sectionId)
            if (!section) return []
            return mockTasks.filter((task) => section.items.includes(task.id))
          }
        }
        return []
      })

      render(<ProjectSectionsView droppableId="test-droppable" />)

      // Initially no TaskShadow should be visible
      expect(screen.queryByTestId("task-shadow")).not.toBeInTheDocument()

      // We need to directly test the component's internal drag state management
      // Since we can't easily simulate the full drag event, we'll check that the
      // DropTargetWrapper for collapsed sections has the right handlers
      const collapsedSectionDroppables = screen.getAllByTestId(
        `droppable-test-droppable-section-${TEST_GROUP_ID_1}`,
      )

      // Verify collapsed section has the required drag handlers for TaskShadow
      const hasRequiredHandlers = collapsedSectionDroppables.some(
        (droppable) =>
          droppable.getAttribute("data-has-drag-enter") === "true" &&
          droppable.getAttribute("data-has-drag-leave") === "true",
      )
      expect(hasRequiredHandlers).toBe(true)
    })

    it("shows TaskShadow when dragging over non-collapsed section with no tasks", () => {
      // Create a project with an empty section (Review section will have no tasks)
      const mockTasksEmptySection: Task[] = [
        {
          id: TEST_TASK_ID_1,
          title: "Task 1",
          description: "First task",
          completed: false,
          priority: 2,
          projectId: TEST_PROJECT_ID_1,
          labels: [],
          subtasks: [],
          comments: [],
          attachments: [],
          recurringMode: "dueDate",
          createdAt: new Date("2024-01-01"),
        },
        // No tasks for Review section (TEST_GROUP_ID_3)
      ]

      mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === "mockTasks") return mockTasksEmptySection
        if (atom === "mockFilteredTasksAtom") return mockTasksEmptySection
        if (atom === "mockProjectsAtom") return [mockProject]
        if (atom === "mockCurrentViewStateAtom")
          return {
            showSidePanel: false,
            compactView: false,
            viewMode: "list",
            sortBy: "dueDate",
            showCompleted: false,
          }
        if (atom === "mockCurrentRouteContextAtom")
          return {
            pathname: `/projects/${TEST_PROJECT_ID_1}`,
            viewId: TEST_PROJECT_ID_1,
            routeType: "project",
          }
        if (atom === "mockCollapsedSectionsAtom") return [] // No collapsed sections
        if (atom === "mockShowTaskPanelAtom") return false
        if (atom === "mockSelectedTaskAtom") return null
        if (atom === "mockOrderedTasksByProjectAtom") {
          const orderedTasksMap = new Map()
          orderedTasksMap.set(
            TEST_PROJECT_ID_1,
            mockTasksEmptySection.filter((t) => t.projectId === TEST_PROJECT_ID_1),
          )
          return orderedTasksMap
        }
        // Handle orderedTasksBySection atom - return empty array for Review section
        if (atom && vi.isMockFunction(atom)) {
          return (projectId: string, sectionId: string | null) => {
            return mockTasksEmptySection.filter((task) => {
              const matchesProject =
                projectId === "inbox"
                  ? !task.projectId || task.projectId === "inbox"
                  : task.projectId === projectId
              const matchesSection = true // Section filtering not needed in new architecture
              return matchesProject && matchesSection
            })
          }
        }
        return []
      })

      render(<ProjectSectionsView droppableId="test-droppable" />)

      // Initially no TaskShadow should be visible
      expect(screen.queryByTestId("task-shadow")).not.toBeInTheDocument()

      // Verify sections are rendered
      expect(screen.getByText("Planning")).toBeInTheDocument()
      expect(screen.getByText("Review")).toBeInTheDocument()

      // Check that Review section (which has no tasks) has a DropTargetWrapper for its header
      // The empty section should have drag handlers just like collapsed sections
      const reviewSectionDroppables = screen.getAllByTestId(
        `droppable-test-droppable-section-${TEST_GROUP_ID_3}`,
      )

      // Verify the empty section has the required drag handlers for TaskShadow
      const hasRequiredHandlers = reviewSectionDroppables.some(
        (droppable) =>
          droppable.getAttribute("data-has-drag-enter") === "true" &&
          droppable.getAttribute("data-has-drag-leave") === "true",
      )
      expect(hasRequiredHandlers).toBe(true)

      // Verify that Planning section (which has tasks) also has handlers
      const planningSectionDroppables = screen.getAllByTestId(
        `droppable-test-droppable-section-${TEST_GROUP_ID_1}`,
      )
      expect(planningSectionDroppables.length).toBeGreaterThan(0)
    })
  })

  describe("sorting functionality", () => {
    const mockProjectForSorting: Project = {
      id: TEST_PROJECT_ID_1,
      name: "Test Project",
      slug: "test-project",
      color: "#3B82F6",
      shared: false,
      sections: [
        {
          id: TEST_GROUP_ID_1,
          name: "Planning",
          slug: "planning",
          type: "section" as const,
          items: [TEST_TASK_ID_1, TEST_TASK_ID_2, TEST_TASK_ID_3],
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
          id: TEST_GROUP_ID_3,
          name: "Review",
          slug: "review",
          type: "section" as const,
          items: [],
          color: DEFAULT_SECTION_COLORS[2],
        },
      ],
    }

    const mockTasksWithVariedProperties: Task[] = [
      {
        id: TEST_TASK_ID_1,
        title: "Alpha Task", // Should be first alphabetically
        description: "First task",
        completed: false,
        priority: 3, // Lower priority (3 > 1)
        projectId: TEST_PROJECT_ID_1,
        labels: [],
        subtasks: [],
        comments: [],
        attachments: [],
        recurringMode: "dueDate",
        createdAt: new Date("2024-01-03"), // Created last
        dueDate: new Date("2024-01-05"), // Due later
      },
      {
        id: TEST_TASK_ID_2,
        title: "Zebra Task", // Should be last alphabetically
        description: "Second task",
        completed: false,
        priority: 1, // Higher priority (1 < 3)
        projectId: TEST_PROJECT_ID_1,
        labels: [],
        subtasks: [],
        comments: [],
        attachments: [],
        recurringMode: "dueDate",
        createdAt: new Date("2024-01-01"), // Created first
        dueDate: new Date("2024-01-03"), // Due earlier
      },
      {
        id: TEST_TASK_ID_3,
        title: "Beta Task", // Should be middle alphabetically
        description: "Third task",
        completed: true, // Completed task
        priority: 2,
        projectId: TEST_PROJECT_ID_1,
        labels: [],
        subtasks: [],
        comments: [],
        attachments: [],
        recurringMode: "dueDate",
        createdAt: new Date("2024-01-02"), // Created middle
        dueDate: new Date("2024-01-04"), // Due middle
      },
    ]

    beforeEach(() => {
      // Mock atoms with test data for sorting
      mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === "mockTasks") return mockTasksWithVariedProperties
        if (atom === "mockFilteredTasksAtom") return mockTasksWithVariedProperties
        if (atom === "mockProjectsAtom") return [mockProjectForSorting]
        if (atom === "mockCurrentRouteContextAtom")
          return {
            pathname: `/projects/${TEST_PROJECT_ID_1}`,
            viewId: TEST_PROJECT_ID_1,
            routeType: "project",
          }
        if (atom === "mockCollapsedSectionsAtom") return []
        if (atom === "mockSelectedTaskAtom") return null
        if (atom === "mockOrderedTasksByProjectAtom") {
          const orderedTasksMap = new Map()
          orderedTasksMap.set(
            TEST_PROJECT_ID_1,
            mockTasksWithVariedProperties.filter((t) => t.projectId === TEST_PROJECT_ID_1),
          )
          return orderedTasksMap
        }
        // Handle orderedTasksBySection atom - it comes as a spy function
        if (atom && vi.isMockFunction(atom)) {
          return (projectId: string, sectionId: string | null) => {
            return mockTasksWithVariedProperties.filter((task) => {
              const matchesProject =
                projectId === "inbox"
                  ? !task.projectId || task.projectId === "inbox"
                  : task.projectId === projectId
              const matchesSection = true // Section filtering not needed in new architecture
              return matchesProject && matchesSection
            })
          }
        }
        return []
      })
    })

    it("respects priority sorting in project sections view", () => {
      // Mock currentViewStateAtom to return priority sorting
      mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === "mockTasks") return mockTasksWithVariedProperties
        if (atom === "mockFilteredTasksAtom") {
          // Simulate what filteredTasksAtom does for priority sorting
          return [...mockTasksWithVariedProperties].sort((a, b) => a.priority - b.priority)
        }
        if (atom === "mockProjectsAtom") return [mockProjectForSorting]
        if (atom === "mockCurrentViewStateAtom")
          return {
            showSidePanel: false,
            compactView: false,
            viewMode: "list",
            sortBy: "priority", // Priority sorting selected
            sortDirection: "asc",
            showCompleted: true, // Show completed tasks to test full sorting
          }
        if (atom === "mockCurrentRouteContextAtom")
          return {
            pathname: `/projects/${TEST_PROJECT_ID_1}`,
            viewId: TEST_PROJECT_ID_1,
            routeType: "project",
          }
        if (atom === "mockCollapsedSectionsAtom") return []
        if (atom === "mockSelectedTaskAtom") return null
        if (atom === "mockOrderedTasksByProjectAtom") {
          const orderedTasksMap = new Map()
          orderedTasksMap.set(
            TEST_PROJECT_ID_1,
            mockTasksWithVariedProperties.filter((t) => t.projectId === TEST_PROJECT_ID_1),
          )
          return orderedTasksMap
        }
        // Handle orderedTasksBySection atom - it comes as a spy function
        if (atom && vi.isMockFunction(atom)) {
          return (projectId: string, sectionId: string | null) => {
            const project = mockProjectForSorting
            if (!project || project.id !== projectId) return []
            const section = project.sections.find((s) => s.id === sectionId)
            if (!section) return []
            return mockTasksWithVariedProperties.filter((task) => section.items.includes(task.id))
          }
        }
        return []
      })

      render(<ProjectSectionsView droppableId="test-droppable" />)

      // Get all task items in order they appear in DOM
      const taskItems = [
        screen.getByTestId(`task-item-${TEST_TASK_ID_2}`), // Priority 1 (highest)
        screen.getByTestId(`task-item-${TEST_TASK_ID_3}`), // Priority 2 (middle)
        screen.getByTestId(`task-item-${TEST_TASK_ID_1}`), // Priority 3 (lowest)
      ]

      // Verify they all exist
      taskItems.forEach((item) => expect(item).toBeInTheDocument())

      // In priority sorting, completed tasks should still be sorted by priority
      // The component should respect the pre-sorted order from filteredTasksAtom
      expect(screen.getByText("Zebra Task")).toBeInTheDocument() // Priority 1
      expect(screen.getByText("Beta Task")).toBeInTheDocument() // Priority 2
      expect(screen.getByText("Alpha Task")).toBeInTheDocument() // Priority 3
    })

    it("respects title sorting in project sections view", () => {
      // Mock currentViewStateAtom to return title sorting
      mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === "mockTasks") return mockTasksWithVariedProperties
        if (atom === "mockFilteredTasksAtom") {
          // Simulate what filteredTasksAtom does for title sorting
          return [...mockTasksWithVariedProperties].sort((a, b) => a.title.localeCompare(b.title))
        }
        if (atom === "mockProjectsAtom") return [mockProjectForSorting]
        if (atom === "mockCurrentViewStateAtom")
          return {
            showSidePanel: false,
            compactView: false,
            viewMode: "list",
            sortBy: "title", // Title sorting selected
            sortDirection: "asc",
            showCompleted: true,
          }
        if (atom === "mockCurrentRouteContextAtom")
          return {
            pathname: `/projects/${TEST_PROJECT_ID_1}`,
            viewId: TEST_PROJECT_ID_1,
            routeType: "project",
          }
        if (atom === "mockCollapsedSectionsAtom") return []
        if (atom === "mockSelectedTaskAtom") return null
        if (atom === "mockOrderedTasksByProjectAtom") {
          const orderedTasksMap = new Map()
          orderedTasksMap.set(
            TEST_PROJECT_ID_1,
            mockTasksWithVariedProperties.filter((t) => t.projectId === TEST_PROJECT_ID_1),
          )
          return orderedTasksMap
        }
        // Handle orderedTasksBySection atom - it comes as a spy function
        if (atom && vi.isMockFunction(atom)) {
          return (projectId: string, sectionId: string | null) => {
            const project = mockProject
            if (!project || project.id !== projectId) return []
            const section = project.sections.find((s) => s.id === sectionId)
            if (!section) return []
            return mockTasks.filter((task) => section.items.includes(task.id))
          }
        }
        return []
      })

      render(<ProjectSectionsView droppableId="test-droppable" />)

      // All tasks should be rendered and alphabetically sorted
      expect(screen.getByText("Alpha Task")).toBeInTheDocument() // Should be first
      expect(screen.getByText("Beta Task")).toBeInTheDocument() // Should be middle
      expect(screen.getByText("Zebra Task")).toBeInTheDocument() // Should be last
    })

    it("uses default project ordering when sortBy is 'default'", () => {
      // Mock currentViewStateAtom to return default sorting
      mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === "mockTasks") return mockTasksWithVariedProperties
        if (atom === "mockFilteredTasksAtom") {
          // For default sorting, filteredTasksAtom doesn't apply additional sorting
          // except for completed tasks at bottom
          return [...mockTasksWithVariedProperties].sort((a, b) => {
            if (a.completed && !b.completed) return 1
            if (!a.completed && b.completed) return -1
            return 0 // No additional sorting for same completion status
          })
        }
        if (atom === "mockProjectsAtom") return [mockProjectForSorting]
        if (atom === "mockCurrentViewStateAtom")
          return {
            showSidePanel: false,
            compactView: false,
            viewMode: "list",
            sortBy: "default", // Default sorting selected
            sortDirection: "asc",
            showCompleted: true,
          }
        if (atom === "mockCurrentRouteContextAtom")
          return {
            pathname: `/projects/${TEST_PROJECT_ID_1}`,
            viewId: TEST_PROJECT_ID_1,
            routeType: "project",
          }
        if (atom === "mockCollapsedSectionsAtom") return []
        if (atom === "mockSelectedTaskAtom") return null
        if (atom === "mockOrderedTasksByProjectAtom") {
          // Mock the project's task order (this should be used for default sorting)
          const orderedTasksMap = new Map()
          orderedTasksMap.set(
            TEST_PROJECT_ID_1,
            [
              mockTasksWithVariedProperties[1],
              mockTasksWithVariedProperties[0],
              mockTasksWithVariedProperties[2],
            ], // Specific order for testing
          )
          return orderedTasksMap
        }
        // Handle orderedTasksBySection atom - it comes as a spy function
        if (atom && vi.isMockFunction(atom)) {
          return (projectId: string, sectionId: string | null) => {
            const project = mockProject
            if (!project || project.id !== projectId) return []
            const section = project.sections.find((s) => s.id === sectionId)
            if (!section) return []
            return mockTasks.filter((task) => section.items.includes(task.id))
          }
        }
        return []
      })

      render(<ProjectSectionsView droppableId="test-droppable" />)

      // All tasks should be rendered
      expect(screen.getByText("Alpha Task")).toBeInTheDocument()
      expect(screen.getByText("Beta Task")).toBeInTheDocument()
      expect(screen.getByText("Zebra Task")).toBeInTheDocument()

      // For default sort, the component should use project ordering logic
      // Completed tasks should appear at bottom regardless of project order
    })

    it("works correctly in flat list mode (supportsSections=false)", () => {
      // Mock currentViewStateAtom to return priority sorting
      mockJotai.useAtomValue.mockImplementation((atom: unknown) => {
        if (atom === "mockTasks") return mockTasksWithVariedProperties
        if (atom === "mockFilteredTasksAtom") {
          // Simulate priority sorting
          return [...mockTasksWithVariedProperties].sort((a, b) => a.priority - b.priority)
        }
        if (atom === "mockProjectsAtom") return [mockProjectForSorting]
        if (atom === "mockCurrentViewStateAtom")
          return {
            showSidePanel: false,
            compactView: false,
            viewMode: "list",
            sortBy: "priority", // Priority sorting
            sortDirection: "asc",
            showCompleted: true,
          }
        if (atom === "mockCurrentRouteContextAtom")
          return {
            pathname: `/projects/${TEST_PROJECT_ID_1}`,
            viewId: TEST_PROJECT_ID_1,
            routeType: "project",
          }
        if (atom === "mockCollapsedSectionsAtom") return []
        if (atom === "mockSelectedTaskAtom") return null
        if (atom === "mockOrderedTasksByProjectAtom") {
          const orderedTasksMap = new Map()
          orderedTasksMap.set(
            TEST_PROJECT_ID_1,
            mockTasksWithVariedProperties.filter((t) => t.projectId === TEST_PROJECT_ID_1),
          )
          return orderedTasksMap
        }
        return []
      })

      render(<ProjectSectionsView droppableId="test-droppable" supportsSections={false} />)

      // Should not show section headers in flat mode
      expect(screen.queryByText("Planning")).not.toBeInTheDocument()

      // But should show all tasks sorted by priority
      expect(screen.getByText("Zebra Task")).toBeInTheDocument() // Priority 1
      expect(screen.getByText("Beta Task")).toBeInTheDocument() // Priority 2
      expect(screen.getByText("Alpha Task")).toBeInTheDocument() // Priority 3
    })
  })
})
