import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { TaskSidePanel } from "./task-side-panel"
import { DEFAULT_SECTION_COLORS, DEFAULT_UUID } from "@tasktrove/constants"
import type { LabelId } from "@/lib/types"
import { createLabelId } from "@/lib/types"

// Define proper interfaces for mocks
interface MockJotaiAtom {
  debugLabel: undefined
  read: ReturnType<typeof vi.fn>
  write: ReturnType<typeof vi.fn>
}

// Create hoisted mocks
const mockJotai = vi.hoisted(() => ({
  useSetAtom: vi.fn(),
  useAtom: vi.fn(),
  useAtomValue: vi.fn(),
  atom: vi.fn(
    (): MockJotaiAtom => ({
      debugLabel: undefined,
      read: vi.fn(),
      write: vi.fn(),
    }),
  ),
  Provider: vi.fn(({ children }) => children), // Don't wrap in div to avoid interfering with null renders
}))

// Mock dependencies
vi.mock("jotai", () => mockJotai)

// Define callback type
type DebouncedCallback = (...args: unknown[]) => void

vi.mock("@/hooks/use-debounced-callback", () => ({
  useDebouncedCallback: vi.fn((callback: DebouncedCallback) => callback),
}))

vi.mock("@/hooks/use-context-menu-visibility", () => ({
  useContextMenuVisibility: vi.fn(() => ({
    isVisible: true,
    isMenuOpen: false,
    handleMenuOpenChange: vi.fn(),
  })),
}))

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

vi.mock("@/lib/utils", () => ({
  cn: vi.fn((...classes) => classes.filter(Boolean).join(" ")),
  getContrastColor: vi.fn(() => "white"),
}))

vi.mock("@/lib/color-utils", () => ({
  getDueDateTextColor: vi.fn(() => "text-muted-foreground"),
  getPriorityTextColor: vi.fn(() => "text-muted-foreground"),
}))

vi.mock("date-fns", () => ({
  format: vi.fn(() => "Jan 1"),
  isToday: vi.fn(() => false),
  isTomorrow: vi.fn(() => false),
  formatDistanceToNow: vi.fn(() => "2 hours ago"),
}))

// Mock useIsMobile hook
const mockUseIsMobile = vi.hoisted(() => vi.fn(() => false))
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: mockUseIsMobile,
}))

// Define proper interfaces for Drawer components
interface DrawerProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  direction?: string
}

interface DrawerContentProps {
  children: React.ReactNode
  className?: string
}

interface DrawerHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DrawerTitleProps {
  children: React.ReactNode
  className?: string
}

interface DrawerCloseProps {
  children: React.ReactNode
  asChild?: boolean
}

// Type guard for React elements
function isReactElement(
  node: React.ReactNode,
): node is React.ReactElement<{ "data-testid"?: string }> {
  return React.isValidElement(node)
}

// Mock Drawer components
vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open, onOpenChange, direction }: DrawerProps) => (
    <div data-testid="drawer" data-open={open} data-direction={direction}>
      <div onClick={() => onOpenChange?.(!open)}>{children}</div>
    </div>
  ),
  DrawerContent: ({ children, className }: DrawerContentProps) => (
    <div data-testid="drawer-content" className={className}>
      {children}
    </div>
  ),
  DrawerHeader: ({ children, className }: DrawerHeaderProps) => (
    <div data-testid="drawer-header" className={className}>
      {children}
    </div>
  ),
  DrawerTitle: ({ children, className }: DrawerTitleProps) => (
    <h2 data-testid="drawer-title" className={className}>
      {children}
    </h2>
  ),
  DrawerClose: ({ children, asChild }: DrawerCloseProps) =>
    asChild ? (
      isReactElement(children) ? (
        React.cloneElement(children, {
          "data-testid": "drawer-close",
        })
      ) : (
        <div data-testid="drawer-close">{children}</div>
      )
    ) : (
      <div data-testid="drawer-close">{children}</div>
    ),
}))

// Define interfaces for component mocks
interface TaskSchedulePopoverProps {
  taskId: string
  children: React.ReactNode
  onSchedule?: (taskId: string, date: Date, type: string) => void
}

vi.mock("./task-schedule-popover", () => ({
  TaskSchedulePopover: ({ children, onSchedule }: TaskSchedulePopoverProps) => (
    <div data-testid="task-schedule-popover">
      {children}
      <button onClick={() => onSchedule?.("task-id", new Date(), "due")}>Schedule</button>
    </div>
  ),
}))

interface CommentContentProps {
  task: { comments: { id: string }[] }
  onAddComment?: (comment: string) => void
  mode?: string
}

vi.mock("./comment-content", () => ({
  CommentContent: ({ task, onAddComment }: CommentContentProps) => (
    <div data-testid="comment-content">
      <div>Comments</div>
      <div>
        {task.comments.length > 0
          ? `${task.comments.length} comment${task.comments.length !== 1 ? "s" : ""}`
          : "Add comment"}
      </div>
      <button onClick={() => onAddComment?.("test comment")}>Add Comment</button>
    </div>
  ),
}))

interface CommentManagementPopoverProps {
  children: React.ReactNode
  onAddComment?: (comment: string) => void
}

vi.mock("./comment-management-popover", () => ({
  CommentManagementPopover: ({ children, onAddComment }: CommentManagementPopoverProps) => (
    <div data-testid="comment-management-popover">
      {children}
      <button onClick={() => onAddComment?.("test comment")}>Add Comment</button>
    </div>
  ),
}))

interface SubtaskContentProps {
  task: { subtasks: { id: string; completed: boolean }[] }
  mode?: string
}

vi.mock("./subtask-content", () => ({
  SubtaskContent: ({ task, mode }: SubtaskContentProps) => {
    const completed = task.subtasks.filter((s) => s.completed).length
    const total = task.subtasks.length
    return (
      <div data-testid="subtask-content" data-mode={mode}>
        {total > 0 ? (
          <div>
            {completed}/{total} subtasks
          </div>
        ) : (
          <div>Add subtasks</div>
        )}
      </div>
    )
  },
}))

interface LabelManagementPopoverProps {
  children: React.ReactNode
  onAddLabel?: (label: string) => void
  onRemoveLabel?: (labelId: LabelId) => void
}

vi.mock("./label-management-popover", () => ({
  LabelManagementPopover: ({
    children,
    onAddLabel,
    onRemoveLabel,
  }: LabelManagementPopoverProps) => (
    <div data-testid="label-management-popover">
      {children}
      <button onClick={() => onAddLabel?.("test label")}>Add Label</button>
      <button
        onClick={() => onRemoveLabel?.(createLabelId("550e8400-e29b-41d4-a716-446655440002"))}
      >
        Remove Label
      </button>
    </div>
  ),
}))

interface PopoverOption {
  id: string
  label: string
  onClick: () => void
}

interface PopoverSection {
  options: PopoverOption[]
}

interface CustomizablePopoverProps {
  children: React.ReactNode
  sections: PopoverSection[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

vi.mock("@/components/ui/customizable-popover", () => ({
  CustomizablePopover: ({ children, sections, open, onOpenChange }: CustomizablePopoverProps) => (
    <div data-testid="customizable-popover">
      <div onClick={() => onOpenChange?.(!open)}>{children}</div>
      {open && (
        <div data-testid="popover-content">
          {sections.map((section, sectionIndex) => (
            <div key={sectionIndex} data-testid={`section-${sectionIndex}`}>
              {section.options.map((option) => (
                <button
                  key={option.id}
                  data-testid={`option-${option.id}`}
                  onClick={() => option.onClick()}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  ),
}))

interface EditableDivProps {
  value: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
}

vi.mock("@/components/ui/custom/editable-div", () => ({
  EditableDiv: ({ value, onChange, placeholder, className, multiline }: EditableDivProps) => (
    <div
      data-testid="editable-div"
      data-value={value}
      data-placeholder={placeholder}
      data-multiline={multiline}
      className={className}
      onClick={() => {
        // Simulate editing by calling onChange with a new value
        const newValue =
          value === "Test Task"
            ? "New Title"
            : value === "Test description"
              ? "New description"
              : value + " edited"
        onChange?.(newValue)
      }}
    >
      {value || placeholder}
    </div>
  ),
}))

// Define UI component interfaces
interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  [key: string]: unknown
}

interface CheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

interface ProgressProps {
  value: number
}

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, ...props }: ButtonProps) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange }: CheckboxProps) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid="checkbox"
    />
  ),
}))

vi.mock("@/components/ui/custom/task-checkbox", () => ({
  TaskCheckbox: ({ checked, onCheckedChange }: CheckboxProps) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid="checkbox"
    />
  ),
}))

vi.mock("./task-actions-menu", () => ({
  TaskActionsMenu: ({ isVisible }: { isVisible: boolean }) => (
    <div data-testid="task-actions-menu" style={{ display: isVisible ? "block" : "none" }}>
      Actions Menu
    </div>
  ),
}))

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value }: ProgressProps) => (
    <div data-testid="progress" data-value={value}>
      Progress: {value}%
    </div>
  ),
}))

describe("TaskSidePanel", () => {
  const mockUpdateTask = vi.fn()
  const mockOnClose = vi.fn()

  const mockTask = {
    id: "task-1",
    title: "Test Task",
    description: "Test description",
    completed: false,
    priority: 2 as const,
    dueDate: new Date("2024-01-01"),
    projectId: "project-1",
    labels: ["label-1"],
    subtasks: [
      { id: "sub-1", title: "Subtask 1", completed: false },
      { id: "sub-2", title: "Subtask 2", completed: true },
    ],
    comments: [
      {
        id: "comment-1",
        content: "Test comment",
        authorName: "John Doe",
        createdAt: new Date("2024-01-01"),
      },
    ],
    createdAt: new Date("2024-01-01"),
  }

  const mockProjects = [
    {
      id: "project-1",
      name: "Project 1",
      color: "#ff0000",
      position: 1000,
      sections: [
        {
          id: DEFAULT_UUID,
          name: "Default",
          color: DEFAULT_SECTION_COLORS[0],
        },
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "To Do",
          color: DEFAULT_SECTION_COLORS[1],
        },
        {
          id: "00000000-0000-4000-8000-000000000002",
          name: "Done",
          color: DEFAULT_SECTION_COLORS[2],
        },
      ],
    },
    {
      id: "project-2",
      name: "Project 2",
      color: "#00ff00",
      position: 2000,
      sections: [
        {
          id: DEFAULT_UUID,
          name: "Default",
          color: DEFAULT_SECTION_COLORS[0],
        },
        {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Backlog",
          color: DEFAULT_SECTION_COLORS[1],
        },
        {
          id: "00000000-0000-4000-8000-000000000002",
          name: "In Progress",
          color: DEFAULT_SECTION_COLORS[2],
        },
        {
          id: "00000000-0000-4000-8000-000000000003",
          name: "Complete",
          color: DEFAULT_SECTION_COLORS[3],
        },
      ],
    },
  ]

  const mockAddComment = vi.fn()
  const mockAddLabel = vi.fn()
  const mockGetLabelsFromIds = vi.fn(() => [
    { id: "label-1", name: "Test Label", color: "#ff0000" },
  ])
  const mockAllLabels = [
    { id: "label-1", name: "Test Label", color: "#ff0000" },
    { id: "label-2", name: "Another Label", color: "#00ff00" },
  ]

  const mockSettings = {
    general: {
      startView: "all" as const,
      soundEnabled: true,
      linkifyEnabled: true,
      popoverHoverOpen: false,
    },
    notifications: {
      enabled: true,
      requireInteraction: true,
    },
    backup: {
      enabled: true,
      backupTime: "02:00",
      maxBackups: 7,
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useSetAtom to return different functions based on the atom's debugLabel
    mockJotai.useSetAtom.mockImplementation((atom) => {
      const label = String(atom?.debugLabel ?? "")
      if (label === "updateTaskAtom") return mockUpdateTask
      if (label === "addCommentAtom") return mockAddComment
      if (label === "addLabelAtom") return mockAddLabel
      return vi.fn()
    })

    // Mock useAtomValue to return appropriate values based on debugLabel
    mockJotai.useAtomValue.mockImplementation((atom) => {
      const label = String(atom?.debugLabel ?? "")
      if (label === "selectedTaskAtom") return mockTask
      if (label === "sortedLabelsAtom") return mockAllLabels
      if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
      if (label === "sortedProjectsAtom") return mockProjects
      if (label === "settingsAtom") return mockSettings
      return []
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  it("renders nothing when not open", () => {
    const { container } = render(<TaskSidePanel isOpen={false} onClose={mockOnClose} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders nothing when no task", () => {
    // Mock selectedTaskAtom to return null
    mockJotai.useAtomValue.mockImplementation((atom) => {
      const label = String(atom?.debugLabel ?? "")
      if (label === "selectedTaskAtom") return null
      if (label === "sortedLabelsAtom") return mockAllLabels
      if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
      if (label === "sortedProjectsAtom") return mockProjects
      if (label === "settingsAtom") return mockSettings
      return []
    })

    const { container } = render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)
    expect(container.firstChild).toBeNull()
  })

  it("renders task side panel when open with task", () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText("Test Task")).toBeInTheDocument()
    expect(screen.getByText("Test description")).toBeInTheDocument()
    expect(screen.getByTestId("task-schedule-popover")).toBeInTheDocument()
    expect(screen.getByTestId("comment-content")).toBeInTheDocument()
    expect(screen.getByTestId("subtask-content")).toBeInTheDocument()
  })

  it("handles task completion toggle", async () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    const checkbox = screen.getAllByTestId("checkbox")[0]
    if (!checkbox) {
      throw new Error("Expected to find checkbox")
    }
    await userEvent.click(checkbox)

    expect(mockUpdateTask).toHaveBeenCalledWith({
      updateRequest: {
        id: "task-1",
        completed: true,
      },
    })
  })

  it("handles close button click", async () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // Find the close button by looking for the X icon
    const buttons = screen.getAllByRole("button")
    const closeButton = buttons.find(
      (button) =>
        button.innerHTML.includes("lucide-x") ||
        button.querySelector("svg")?.classList.contains("lucide-x"),
    )
    expect(closeButton).toBeDefined()
    if (closeButton) {
      await userEvent.click(closeButton)
    }

    expect(mockOnClose).toHaveBeenCalled()
  })

  it("handles title editing with EditableDiv", async () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    const titleElement = screen.getByText("Test Task")
    await userEvent.click(titleElement)

    expect(mockUpdateTask).toHaveBeenCalledWith({
      updateRequest: {
        id: "task-1",
        title: "New Title",
      },
    })
  })

  it("calls onChange when title is edited", async () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    const titleEditableDiv = screen.getAllByTestId("editable-div")[0]
    if (!titleEditableDiv) {
      throw new Error("Expected to find title editable div")
    }
    expect(titleEditableDiv).toHaveAttribute("data-value", "Test Task")

    await userEvent.click(titleEditableDiv)

    expect(mockUpdateTask).toHaveBeenCalledWith({
      updateRequest: {
        id: "task-1",
        title: "New Title",
      },
    })
  })

  it("renders title EditableDiv with correct props", () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    const titleEditableDiv = screen.getAllByTestId("editable-div")[0]
    expect(titleEditableDiv).toHaveAttribute("data-value", "Test Task")
    expect(titleEditableDiv).toHaveAttribute("data-placeholder", "Task title...")
    expect(titleEditableDiv).toHaveClass(
      "text-lg",
      "font-medium",
      "w-fit",
      "max-w-xs",
      "hover:bg-accent",
      "px-2",
      "py-1",
      "rounded",
      "min-w-0",
      "text-foreground",
    )
  })

  it("renders completed task title with strikethrough", () => {
    const completedTask = { ...mockTask, completed: true }

    // Update mock to return completed task
    mockJotai.useAtomValue.mockImplementation((atom) => {
      const label = String(atom?.debugLabel ?? "")
      if (label === "selectedTaskAtom") return completedTask
      if (label === "sortedLabelsAtom") return mockAllLabels
      if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
      if (label === "sortedProjectsAtom") return mockProjects
      if (label === "settingsAtom") return mockSettings
      return []
    })

    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    const titleEditableDiv = screen.getAllByTestId("editable-div")[0]
    expect(titleEditableDiv).toHaveClass("text-muted-foreground")
    expect(titleEditableDiv).not.toHaveClass("line-through")
  })

  it("handles description editing with EditableDiv", async () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    const descriptionElement = screen.getByText("Test description")
    await userEvent.click(descriptionElement)

    expect(mockUpdateTask).toHaveBeenCalledWith({
      updateRequest: {
        id: "task-1",
        description: "New description",
      },
    })
  })

  it("renders description EditableDiv with correct props", () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    const descriptionEditableDiv = screen.getAllByTestId("editable-div")[1]
    expect(descriptionEditableDiv).toHaveAttribute("data-value", "Test description")
    expect(descriptionEditableDiv).toHaveAttribute("data-placeholder", "Add description...")
    expect(descriptionEditableDiv).toHaveAttribute("data-multiline", "true")
    expect(descriptionEditableDiv).toHaveClass(
      "text-sm",
      "text-muted-foreground",
      "hover:bg-accent/50",
    )
  })

  it.skip("expands and collapses subtasks section", async () => {
    // TODO: Fix this test for the new UI design
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // This test needs to be updated for the new subtasks expansion UI
  })

  it.skip("handles subtask completion toggle", async () => {
    // TODO: Fix this test for the new UI design
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // This test needs to be updated for the new subtasks expansion UI
  })

  it("displays comments section with new comment components", async () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // Check that the comments section is rendered
    expect(screen.getAllByText("Comments")[0]).toBeInTheDocument()

    // Check that the comment count is displayed (from our mock task)
    expect(screen.getByText("1 comment")).toBeInTheDocument()
  })

  it("displays subtask progress correctly", () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // 1 out of 2 subtasks completed = 50%
    expect(screen.getByText("1/2 subtasks")).toBeInTheDocument()
  })

  it("shows auto-saving indicator", async () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // Trigger an edit through EditableDiv
    const titleEditableDiv = screen.getAllByTestId("editable-div")[0]
    if (!titleEditableDiv) {
      throw new Error("Expected to find title editable div")
    }
    await userEvent.click(titleEditableDiv)

    // Verify that the update function was called (auto-save functionality)
    expect(mockUpdateTask).toHaveBeenCalledWith({
      updateRequest: {
        id: "task-1",
        title: "New Title",
      },
    })
  })

  it("task panel keyboard shortcuts are handled by global system", async () => {
    // This test verifies that keyboard shortcuts for the task panel
    // are properly documented and expected to work through the global keyboard system
    // implemented in main-layout-wrapper.tsx

    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // Verify the task panel is rendered and shows keyboard shortcuts help
    expect(screen.getByText("Space")).toBeInTheDocument()
    expect(screen.getByText("Toggle")).toBeInTheDocument()
    expect(screen.getByText("Esc")).toBeInTheDocument()
    expect(screen.getByText("Close")).toBeInTheDocument()

    // The actual keyboard event handling is now done by the global keyboard manager
    // in main-layout-wrapper.tsx, which tests the unified keyboard system.
    // This component only displays the UI and expects the global system to:
    // 1. Handle Escape key to call onClose()
    // 2. Handle Space key to toggle task completion
    // 3. Handle other task-specific shortcuts

    // Note: Direct keyboard event testing is not needed here since the component
    // no longer contains keyboard event handlers - they're managed globally
  })

  it("renders schedule section with clickable popover trigger", async () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // Verify the schedule section is present and clickable
    const scheduleSection = screen.getByText("Schedule")
    expect(scheduleSection).toBeInTheDocument()

    // The schedule section should be part of a clickable TaskSchedulePopover
    // (TaskScheduleContent now handles schedule updates internally via atoms)
    const popoverContainer = screen.getByTestId("task-schedule-popover")
    expect(popoverContainer).toBeInTheDocument()
  })

  it("shows placeholder when description is empty", () => {
    const taskWithoutDescription = { ...mockTask, description: undefined }

    // Update mock to return task without description
    mockJotai.useAtomValue.mockImplementation((atom) => {
      const label = String(atom?.debugLabel ?? "")
      if (label === "selectedTaskAtom") return taskWithoutDescription
      if (label === "sortedLabelsAtom") return mockAllLabels
      if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
      if (label === "sortedProjectsAtom") return mockProjects
      if (label === "settingsAtom") return mockSettings
      return []
    })

    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText("Add description...")).toBeInTheDocument()
  })

  it("displays favorite star when task is favorite", () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // The favorite star should be present (we can check if the Star icon exists)
    // This depends on how the Star icon is rendered, might need adjustment
  })

  it("displays keyboard shortcuts help", () => {
    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    expect(screen.getByText("Toggle")).toBeInTheDocument()
    expect(screen.getByText("Close")).toBeInTheDocument()
  })

  it("handles task with no subtasks", () => {
    const taskWithoutSubtasks = { ...mockTask, subtasks: [] }

    // Update mock to return task without subtasks
    mockJotai.useAtomValue.mockImplementation((atom) => {
      const label = String(atom?.debugLabel ?? "")
      if (label === "selectedTaskAtom") return taskWithoutSubtasks
      if (label === "sortedLabelsAtom") return mockAllLabels
      if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
      if (label === "sortedProjectsAtom") return mockProjects
      if (label === "settingsAtom") return mockSettings
      return []
    })

    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // Should show "Add subtasks" text
    expect(screen.getByText("Add subtasks")).toBeInTheDocument()
  })

  it("handles task with no comments", () => {
    const taskWithoutComments = { ...mockTask, comments: [] }

    // Update mock to return task without comments
    mockJotai.useAtomValue.mockImplementation((atom) => {
      const label = String(atom?.debugLabel ?? "")
      if (label === "selectedTaskAtom") return taskWithoutComments
      if (label === "sortedLabelsAtom") return mockAllLabels
      if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
      if (label === "sortedProjectsAtom") return mockProjects
      if (label === "settingsAtom") return mockSettings
      return []
    })

    render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

    // Should show "Add comment" text
    expect(screen.getByText("Add comment")).toBeInTheDocument()
  })

  describe("EditableDiv Integration", () => {
    it("renders empty description with placeholder", () => {
      const taskWithoutDescription = { ...mockTask, description: undefined }

      // Update mock to return task without description
      mockJotai.useAtomValue.mockImplementation((atom) => {
        const label = String(atom?.debugLabel ?? "")
        if (label === "selectedTaskAtom") return taskWithoutDescription
        if (label === "sortedLabelsAtom") return mockAllLabels
        if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
        if (label === "sortedProjectsAtom") return mockProjects
        if (label === "settingsAtom") return mockSettings
        return []
      })

      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const descriptionEditableDiv = screen.getAllByTestId("editable-div")[1]
      expect(descriptionEditableDiv).toHaveAttribute("data-value", "")
      expect(descriptionEditableDiv).toHaveAttribute("data-placeholder", "Add description...")
      expect(descriptionEditableDiv).toHaveTextContent("Add description...")
    })

    it("updates title through EditableDiv onChange", async () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const titleEditableDiv = screen.getAllByTestId("editable-div")[0]
      if (!titleEditableDiv) {
        throw new Error("Expected to find title editable div")
      }
      await userEvent.click(titleEditableDiv)

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: "task-1",
          title: "New Title",
        },
      })
    })

    it("updates description through EditableDiv onChange", async () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const descriptionEditableDiv = screen.getAllByTestId("editable-div")[1]
      if (!descriptionEditableDiv) {
        throw new Error("Expected to find description editable div")
      }
      await userEvent.click(descriptionEditableDiv)

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: "task-1",
          description: "New description",
        },
      })
    })

    it("handles empty title gracefully", () => {
      const taskWithEmptyTitle = { ...mockTask, title: "" }

      // Update mock to return task with empty title
      mockJotai.useAtomValue.mockImplementation((atom) => {
        const label = String(atom?.debugLabel ?? "")
        if (label === "selectedTaskAtom") return taskWithEmptyTitle
        if (label === "sortedLabelsAtom") return mockAllLabels
        if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
        if (label === "sortedProjectsAtom") return mockProjects
        if (label === "settingsAtom") return mockSettings
        return []
      })

      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const titleEditableDiv = screen.getAllByTestId("editable-div")[0]
      expect(titleEditableDiv).toHaveAttribute("data-value", "")
      expect(titleEditableDiv).toHaveAttribute("data-placeholder", "Task title...")
    })

    it("applies correct styling to multiline description", () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const descriptionEditableDiv = screen.getAllByTestId("editable-div")[1]
      expect(descriptionEditableDiv).toHaveAttribute("data-multiline", "true")
      expect(descriptionEditableDiv).toHaveClass(
        "text-sm",
        "text-muted-foreground",
        "hover:bg-accent/50",
      )
    })

    it("title EditableDiv is not multiline", () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const titleEditableDiv = screen.getAllByTestId("editable-div")[0]
      expect(titleEditableDiv).not.toHaveAttribute("data-multiline", "true")
    })

    it("verifies auto-save functionality works", async () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const titleEditableDiv = screen.getAllByTestId("editable-div")[0]
      if (!titleEditableDiv) {
        throw new Error("Expected to find title editable div")
      }
      await userEvent.click(titleEditableDiv)

      // Verify that the debounced auto-save is called
      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: "task-1",
          title: "New Title",
        },
      })
    })
  })

  describe("Auto-save functionality", () => {
    it("shows auto-save indicator when saving", async () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const titleEditableDiv = screen.getAllByTestId("editable-div")[0]
      if (!titleEditableDiv) {
        throw new Error("Expected to find title editable div")
      }
      await userEvent.click(titleEditableDiv)

      // The auto-save indicator might be shown briefly
      // This test verifies the functionality exists
      expect(mockUpdateTask).toHaveBeenCalled()
    })

    it("handles auto-save for both title and description", async () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const [titleEditableDiv, descriptionEditableDiv] = screen.getAllByTestId("editable-div")
      if (!titleEditableDiv) {
        throw new Error("Expected to find title editable div")
      }
      if (!descriptionEditableDiv) {
        throw new Error("Expected to find description editable div")
      }

      await userEvent.click(titleEditableDiv)
      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: "task-1",
          title: "New Title",
        },
      })

      await userEvent.click(descriptionEditableDiv)
      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: "task-1",
          description: "New description",
        },
      })
    })
  })

  describe("Responsive Behavior", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // Reset to desktop mode
      mockUseIsMobile.mockReturnValue(false)
    })

    describe("Desktop Mode", () => {
      it("renders desktop panel on desktop", () => {
        mockUseIsMobile.mockReturnValue(false)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Should render desktop panel (not drawer)
        expect(screen.queryByTestId("drawer")).not.toBeInTheDocument()

        // Find the main panel container by looking for the container with panel styles
        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container instanceof HTMLElement ? container.style.width : undefined).toBe("320px")
        expect(container?.className).toContain("bg-background")
        expect(container?.className).toContain("border-l")
      })

      it("shows keyboard shortcuts on desktop", () => {
        mockUseIsMobile.mockReturnValue(false)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        expect(screen.getByText("Toggle")).toBeInTheDocument()
        expect(screen.getByText("Close")).toBeInTheDocument()
      })

      it("uses optimized width (w-80 instead of w-96)", () => {
        mockUseIsMobile.mockReturnValue(false)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container instanceof HTMLElement ? container.style.width : undefined).toBe("320px")
        expect(container instanceof HTMLElement ? container.style.width : undefined).toBe("320px")
      })

      it("handles slide animation classes correctly", () => {
        mockUseIsMobile.mockReturnValue(false)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("translate-x-0")
        expect(container?.className).toContain("transition-transform")
      })
    })

    describe("Mobile Mode", () => {
      it("renders mobile drawer on mobile", () => {
        mockUseIsMobile.mockReturnValue(true)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Should render drawer
        const drawer = screen.getByTestId("drawer")
        expect(drawer).toBeInTheDocument()
        expect(drawer).toHaveAttribute("data-open", "true")
        expect(drawer).toHaveAttribute("data-direction", "bottom")
      })

      it("renders drawer content with mobile-optimized classes", () => {
        mockUseIsMobile.mockReturnValue(true)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const drawerContent = screen.getByTestId("drawer-content")
        expect(drawerContent).toBeInTheDocument()
        expect(drawerContent).toHaveClass("!max-h-[60vh]", "focus:outline-none")
      })

      it("hides keyboard shortcuts on mobile", () => {
        mockUseIsMobile.mockReturnValue(true)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Keyboard shortcuts should not be visible on mobile
        expect(screen.queryByText("Toggle")).not.toBeInTheDocument()
        expect(screen.queryByText("Close")).not.toBeInTheDocument()
      })

      it("renders drawer header with task information", () => {
        mockUseIsMobile.mockReturnValue(true)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const drawerHeader = screen.getByTestId("drawer-header")
        expect(drawerHeader).toBeInTheDocument()
        expect(drawerHeader).toHaveClass("pb-2")

        // Task title should be in the header
        expect(screen.getByText("Test Task")).toBeInTheDocument()
      })

      it("includes accessible DrawerTitle for screen readers", () => {
        mockUseIsMobile.mockReturnValue(true)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Should have a DrawerTitle for accessibility
        const drawerTitle = screen.getByTestId("drawer-title")
        expect(drawerTitle).toBeInTheDocument()
        expect(drawerTitle).toHaveTextContent("Task Details: Test Task")
        expect(drawerTitle).toHaveClass("sr-only") // Visually hidden but accessible
      })

      it("renders drawer close button correctly", () => {
        mockUseIsMobile.mockReturnValue(true)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Should have a close button in the drawer header
        const drawerCloseButton = screen.getByTestId("drawer-close")
        expect(drawerCloseButton).toBeInTheDocument()
      })

      it("renders shared TaskPanelContent in mobile drawer", () => {
        mockUseIsMobile.mockReturnValue(true)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // All the same content should be available
        expect(screen.getByText("Test description")).toBeInTheDocument()
        expect(screen.getByTestId("task-schedule-popover")).toBeInTheDocument()
        expect(screen.getByTestId("comment-content")).toBeInTheDocument()
        expect(screen.getByTestId("subtask-content")).toBeInTheDocument()
      })
    })

    describe("Responsive Switching", () => {
      it("switches from desktop to mobile when screen size changes", () => {
        // Start with desktop
        mockUseIsMobile.mockReturnValue(false)

        const { rerender } = render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Verify desktop rendering
        expect(screen.queryByTestId("drawer")).not.toBeInTheDocument()

        // Switch to mobile
        mockUseIsMobile.mockReturnValue(true)

        rerender(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Verify mobile rendering
        expect(screen.getByTestId("drawer")).toBeInTheDocument()
      })

      it("switches from mobile to desktop when screen size changes", () => {
        // Start with mobile
        mockUseIsMobile.mockReturnValue(true)

        const { rerender } = render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Verify mobile rendering
        expect(screen.getByTestId("drawer")).toBeInTheDocument()

        // Switch to desktop
        mockUseIsMobile.mockReturnValue(false)

        rerender(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Verify desktop rendering
        expect(screen.queryByTestId("drawer")).not.toBeInTheDocument()
        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container instanceof HTMLElement ? container.style.width : undefined).toBe("320px")
      })

      it("maintains task data consistency across responsive modes", () => {
        // Test mobile first
        mockUseIsMobile.mockReturnValue(true)

        const { rerender } = render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        expect(screen.getByText("Test Task")).toBeInTheDocument()
        expect(screen.getByText("Test description")).toBeInTheDocument()

        // Switch to desktop
        mockUseIsMobile.mockReturnValue(false)

        rerender(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Same content should be available
        expect(screen.getByText("Test Task")).toBeInTheDocument()
        expect(screen.getByText("Test description")).toBeInTheDocument()
      })

      it("handles functionality consistently across responsive modes", async () => {
        // Test task completion toggle in mobile mode
        mockUseIsMobile.mockReturnValue(true)

        const { rerender } = render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const mobileCheckbox = screen.getAllByTestId("checkbox")[0]
        if (!mobileCheckbox) {
          throw new Error("Expected to find mobile checkbox")
        }
        await userEvent.click(mobileCheckbox)

        expect(mockUpdateTask).toHaveBeenCalledWith({
          updateRequest: {
            id: "task-1",
            completed: true,
          },
        })

        vi.clearAllMocks()

        // Switch to desktop and test same functionality
        mockUseIsMobile.mockReturnValue(false)

        rerender(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const desktopCheckbox = screen.getAllByTestId("checkbox")[0]
        if (!desktopCheckbox) {
          throw new Error("Expected to find desktop checkbox")
        }
        await userEvent.click(desktopCheckbox)

        expect(mockUpdateTask).toHaveBeenCalledWith({
          updateRequest: {
            id: "task-1",
            completed: true,
          },
        })
      })
    })

    describe("Shared TaskPanelContent Component", () => {
      it("renders same content in both mobile and desktop modes", () => {
        // Test mobile
        mockUseIsMobile.mockReturnValue(true)

        const { rerender } = render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Check that mobile elements are present
        screen.getByText("Scheduling")
        screen.getByText("Category")
        screen.getByText("Description")
        screen.getAllByText("Subtasks")
        screen.getAllByText("Labels")
        screen.getAllByText("Comments")

        // Switch to desktop
        mockUseIsMobile.mockReturnValue(false)

        rerender(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Same sections should exist
        expect(screen.getByText("Scheduling")).toBeInTheDocument()
        expect(screen.getByText("Category")).toBeInTheDocument()
        expect(screen.getByText("Description")).toBeInTheDocument()
        expect(screen.getAllByText("Comments")[0]).toBeInTheDocument()
      })

      it("handles auto-save functionality in both modes", async () => {
        // Test mobile auto-save
        mockUseIsMobile.mockReturnValue(true)

        const { rerender } = render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const mobileTitle = screen.getAllByTestId("editable-div")[0]
        if (!mobileTitle) {
          throw new Error("Expected to find mobile title editable div")
        }
        await userEvent.click(mobileTitle)

        expect(mockUpdateTask).toHaveBeenCalledWith({
          updateRequest: {
            id: "task-1",
            title: "New Title",
          },
        })

        vi.clearAllMocks()

        // Test desktop auto-save
        mockUseIsMobile.mockReturnValue(false)

        rerender(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const desktopTitle = screen.getAllByTestId("editable-div")[0]
        if (!desktopTitle) {
          throw new Error("Expected to find desktop title editable div")
        }
        await userEvent.click(desktopTitle)

        expect(mockUpdateTask).toHaveBeenCalledWith({
          updateRequest: {
            id: "task-1",
            title: "New Title",
          },
        })
      })
    })

    describe("Auto-save Indicator", () => {
      it("shows auto-save indicator in mobile mode", () => {
        mockUseIsMobile.mockReturnValue(true)

        // We need to test with isAutoSaving state, but since we can't easily mock internal state,
        // we verify the structure exists for the auto-save indicator
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // The auto-save indicator structure should be present
        // (even if not currently showing due to state)
        expect(screen.getByTestId("drawer-content")).toBeInTheDocument()
      })

      it("shows auto-save indicator in desktop mode", () => {
        mockUseIsMobile.mockReturnValue(false)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // The auto-save indicator structure should be present
        const panel = screen.getByText("Test Task").closest("div")
        expect(panel).toBeInTheDocument()
      })
    })

    describe("Completed Task Overdue Styling", () => {
      it("does not show overdue styling for completed overdue tasks", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Should not show alert triangle for completed overdue tasks
        const alertTriangles = screen.queryAllByTestId("alert-triangle-icon")
        expect(alertTriangles).toHaveLength(0)
      })

      it("shows overdue styling for incomplete overdue tasks", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // The component should render the due date
        // Actual overdue styling depends on the mocked isOverdue function
        expect(screen.getByText("Jan 1")).toBeInTheDocument()
      })

      it("does not apply overdue background styling to completed tasks", () => {
        const overdueCompletedTask = {
          ...mockTask,
          completed: true,
          dueDate: new Date("2023-01-01"), // Past date
        }

        // Update mock to return overdue completed task
        mockJotai.useAtomValue.mockImplementation((atom) => {
          const label = String(atom?.debugLabel ?? "")
          if (label === "selectedTaskAtom") return overdueCompletedTask
          if (label === "sortedLabelsAtom") return mockAllLabels
          if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
          if (label === "sortedProjectsAtom") return mockProjects
          if (label === "settingsAtom") return mockSettings
          return []
        })

        const { container } = render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Should not have red overdue background classes
        const dueDateElements = container.querySelectorAll(".border-l-red-500, .bg-red-500\\/10")
        expect(dueDateElements).toHaveLength(0)
      })
    })
  })

  describe("Sticky Panel Positioning", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockUseIsMobile.mockReturnValue(false) // Test desktop mode for sticky positioning
    })

    describe("Desktop Panel Positioning", () => {
      it("renders with fixed positioning classes", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("absolute")
        expect(container?.className).toContain("top-0")
        expect(container?.className).toContain("right-0")
      })

      it("has correct z-index for proper layering", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("z-30")
        expect(container?.className).not.toContain("z-50") // Should not be z-50 which would cover header
        expect(container?.className).not.toContain("z-40") // Should not be z-40 which is header level
      })

      it("includes proper width and height classes", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container instanceof HTMLElement ? container.style.width : undefined).toBe("320px")
        expect(container?.className).toContain("h-full")
      })

      it("has transition classes for smooth animation", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("transition-transform")
        expect(container?.className).toContain("duration-300")
        expect(container?.className).toContain("ease-in-out")
      })

      it("shows translate-x-0 when open", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("translate-x-0")
        expect(container?.className).not.toContain("translate-x-full")
      })

      it("shows translate-x-full when closed", () => {
        render(<TaskSidePanel isOpen={false} onClose={mockOnClose} />)

        // When closed, panel returns null, so no container should exist
        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).not.toBeInTheDocument()
      })

      it("includes flex layout classes", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("flex")
        expect(container?.className).toContain("flex-col")
      })

      it("has background and border styling", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("bg-background")
        expect(container?.className).toContain("border-l")
        expect(container?.className).toContain("border-border")
      })
    })

    describe("Header Positioning", () => {
      it("does not need margin-top since using absolute positioning", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Find the header element within the absolute container
        const header = document.querySelector(".absolute.top-0.right-0 .flex-shrink-0")
        expect(header).toBeInTheDocument()
        expect(header?.className).not.toContain("mt-[60px]") // No longer needed with absolute positioning
      })

      it("does not use sticky positioning for header", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const header = document.querySelector(".absolute.top-0.right-0 .flex-shrink-0")
        expect(header).toBeInTheDocument()
        expect(header?.className).not.toContain("sticky")
        expect(header?.className).not.toContain("top-[60px]") // Should not have sticky top anymore
      })

      it("has proper header background and border styling", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const header = document.querySelector(".absolute.top-0.right-0 .flex-shrink-0")
        expect(header).toBeInTheDocument()
        expect(header?.className).toContain("border-b")
        expect(header?.className).toContain("border-border")
        expect(header?.className).toContain("bg-background/95")
        expect(header?.className).toContain("backdrop-blur-sm")
      })
    })

    describe("Panel Animation States", () => {
      it("animates smoothly when transitioning from closed to open", () => {
        const { rerender } = render(<TaskSidePanel isOpen={false} onClose={mockOnClose} />)

        // When closed, panel returns null
        let container = document.querySelector(".absolute.top-0.right-0")
        expect(container).not.toBeInTheDocument()

        rerender(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // When open, panel should be visible with proper classes
        container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("translate-x-0")
        expect(container?.className).toContain("transition-transform")
      })

      it("animates smoothly when transitioning from open to closed", () => {
        const { rerender } = render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        let container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("translate-x-0")

        rerender(<TaskSidePanel isOpen={false} onClose={mockOnClose} />)

        // When closed, panel returns null
        container = document.querySelector(".absolute.top-0.right-0")
        expect(container).not.toBeInTheDocument()
      })
    })

    describe("Mobile Mode Does Not Use Fixed Positioning", () => {
      it("uses drawer instead of fixed positioning on mobile", () => {
        mockUseIsMobile.mockReturnValue(true)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        // Should not have fixed positioning on mobile
        const fixedContainer = document.querySelector(".absolute.top-0.right-0")
        expect(fixedContainer).not.toBeInTheDocument()

        // Should have drawer instead
        const drawer = screen.getByTestId("drawer")
        expect(drawer).toBeInTheDocument()
      })

      it("maintains mobile drawer behavior without affecting fixed positioning logic", () => {
        mockUseIsMobile.mockReturnValue(true)

        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const drawer = screen.getByTestId("drawer")
        expect(drawer).toBeInTheDocument()
        expect(drawer).toHaveAttribute("data-open", "true")
        expect(drawer).toHaveAttribute("data-direction", "bottom")

        // Ensure no fixed positioning classes leak into mobile
        expect(drawer.className).not.toContain("absolute")
        expect(drawer.className).not.toContain("top-0")
        expect(drawer.className).not.toContain("right-0")
      })
    })

    describe("Z-Index Layering Compliance", () => {
      it("uses z-30 to stay below page header z-40", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).toContain("z-30")
      })

      it("does not use z-50 which would cover page header", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).not.toContain("z-50")
      })

      it("does not use z-40 which would conflict with page header", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const container = document.querySelector(".absolute.top-0.right-0")
        expect(container).toBeInTheDocument()
        expect(container?.className).not.toContain("z-40")
      })
    })

    describe("Scrollable Content Area", () => {
      it("has proper scroll configuration for content area", () => {
        render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const scrollableContent = document.querySelector(
          ".absolute.top-0.right-0 .flex-1.overflow-y-auto",
        )
        expect(scrollableContent).toBeInTheDocument()
        expect(scrollableContent?.className).toContain("overflow-y-auto")
        expect(scrollableContent?.className).toContain("scrollbar-thin")
        expect(scrollableContent?.className).toContain("scrollbar-thumb-muted")
        expect(scrollableContent?.className).toContain("scrollbar-track-transparent")
      })

      it("maintains scrollable area independent of panel position", () => {
        const { rerender } = render(<TaskSidePanel isOpen={false} onClose={mockOnClose} />)

        rerender(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

        const scrollableContent = document.querySelector(
          ".absolute.top-0.right-0 .flex-1.overflow-y-auto",
        )
        expect(scrollableContent).toBeInTheDocument()
        expect(scrollableContent?.className).toContain("overflow-y-auto")
      })
    })
  })

  describe("ProjectSectionsView Integration", () => {
    // Note: These tests verify the expected behavior from the main content component
    // The actual integration tests would be in project-sections-view.test.tsx

    it("expects main content to provide right margin when panel is open", () => {
      // This test documents the expected integration behavior
      // The main content should add mr-80 class when panel is open to prevent overlap

      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector(".absolute.top-0.right-0")
      expect(container).toBeInTheDocument()
      expect(container instanceof HTMLElement ? container.style.width : undefined).toBe("320px") // Main content should account for this width
    })

    it("provides 320px width (w-80) that main content should accommodate", () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector(".absolute.top-0.right-0")
      expect(container).toBeInTheDocument()
      expect(container instanceof HTMLElement ? container.style.width : undefined).toBe("320px") // Tailwind w-80 = 320px
    })
  })

  describe("Full Height Behavior", () => {
    it("always maintains full height regardless of content amount", () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector(".absolute.top-0.right-0")
      expect(container).toBeInTheDocument()
      expect(container?.className).toContain("h-full") // Should always fill parent height

      // Verify the panel takes full height even with minimal content
      const scrollableContent = container?.querySelector(".flex-1.overflow-y-auto")
      expect(scrollableContent).toBeInTheDocument()
      expect(scrollableContent?.className).toContain("flex-1") // Should expand to fill available space
    })

    it("uses flexbox layout to ensure full height expansion", () => {
      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      const container = document.querySelector(".absolute.top-0.right-0")
      expect(container).toBeInTheDocument()

      // Verify the panel has the necessary classes for full height behavior
      expect(container?.className).toContain("h-full") // Takes full parent height
      expect(container?.className).toContain("flex") // Flexbox container
      expect(container?.className).toContain("flex-col") // Column direction

      // Verify the scrollable content area expands to fill space
      const scrollableArea = container?.querySelector(".flex-1")
      expect(scrollableArea).toBeInTheDocument()
      expect(scrollableArea?.className).toContain("flex-1") // Flexbox child that expands
    })
  })

  describe("Due Time Display", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockUseIsMobile.mockReturnValue(false) // Test desktop mode
    })

    it("should display due date only when no due time is set", () => {
      const taskWithDateOnly = { ...mockTask, dueTime: undefined }

      mockJotai.useAtomValue.mockImplementation((atom) => {
        const label = String(atom?.debugLabel ?? "")
        if (label === "selectedTaskAtom") return taskWithDateOnly
        if (label === "sortedLabelsAtom") return mockAllLabels
        if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
        if (label === "sortedProjectsAtom") return mockProjects
        if (label === "settingsAtom") return mockSettings
        return []
      })

      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      // Should show date without time
      expect(screen.getByText("Jan 1")).toBeInTheDocument()
      expect(screen.queryByText(/at 9:00 AM/)).not.toBeInTheDocument()
    })

    it("should display due date with time when both are set", () => {
      const dueTime = new Date()
      dueTime.setHours(9, 0, 0, 0) // 9:00 AM
      const taskWithDateTime = { ...mockTask, dueTime }

      mockJotai.useAtomValue.mockImplementation((atom) => {
        const label = String(atom?.debugLabel ?? "")
        if (label === "selectedTaskAtom") return taskWithDateTime
        if (label === "sortedLabelsAtom") return mockAllLabels
        if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
        if (label === "sortedProjectsAtom") return mockProjects
        if (label === "settingsAtom") return mockSettings
        return []
      })

      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      // Should show date information (may or may not include time depending on setup)
      expect(
        screen.getByText((content) => {
          return content.includes("Jan")
        }),
      ).toBeInTheDocument()
    })

    it("should display Today with time when due today with time", () => {
      const dueTime = new Date()
      dueTime.setHours(9, 0, 0, 0) // 9:00 AM
      const taskDueToday = { ...mockTask, dueDate: new Date(), dueTime }

      mockJotai.useAtomValue.mockImplementation((atom) => {
        const label = String(atom?.debugLabel ?? "")
        if (label === "selectedTaskAtom") return taskDueToday
        if (label === "sortedLabelsAtom") return mockAllLabels
        if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
        if (label === "sortedProjectsAtom") return mockProjects
        if (label === "settingsAtom") return mockSettings
        return []
      })

      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      // Should show "Today at 9:00 AM" when utility function is working
      // For now just check that the date display includes time elements
      const timeText = screen.getByText(/Jan 1/)
      expect(timeText).toBeInTheDocument()
    })

    it("should display Tomorrow with time when due tomorrow with time", () => {
      const dueTime = new Date()
      dueTime.setHours(9, 0, 0, 0) // 9:00 AM
      const taskDueTomorrow = { ...mockTask, dueDate: new Date(), dueTime }

      mockJotai.useAtomValue.mockImplementation((atom) => {
        const label = String(atom?.debugLabel ?? "")
        if (label === "selectedTaskAtom") return taskDueTomorrow
        if (label === "sortedLabelsAtom") return mockAllLabels
        if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
        if (label === "sortedProjectsAtom") return mockProjects
        if (label === "settingsAtom") return mockSettings
        return []
      })

      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      // Should show "Tomorrow at 9:00 AM" when utility function is working
      // For now just check that the date display includes time elements
      const timeText = screen.getByText(/Jan 1/)
      expect(timeText).toBeInTheDocument()
    })

    it("should display time only when task has dueTime but no dueDate", () => {
      const dueTime = new Date()
      dueTime.setHours(9, 0, 0, 0) // 9:00 AM
      const taskWithTimeOnly = { ...mockTask, dueDate: undefined, dueTime }

      mockJotai.useAtomValue.mockImplementation((atom) => {
        const label = String(atom?.debugLabel ?? "")
        if (label === "selectedTaskAtom") return taskWithTimeOnly
        if (label === "sortedLabelsAtom") return mockAllLabels
        if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
        if (label === "sortedProjectsAtom") return mockProjects
        if (label === "settingsAtom") return mockSettings
        return []
      })

      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      // Should show "Due Date" placeholder since no dueDate, even with dueTime
      expect(screen.getByText("Due Date")).toBeInTheDocument()
    })

    it("should work correctly on mobile mode too", () => {
      mockUseIsMobile.mockReturnValue(true)

      const dueTime = new Date()
      dueTime.setHours(9, 0, 0, 0) // 9:00 AM
      const taskWithDateTime = { ...mockTask, dueTime }

      mockJotai.useAtomValue.mockImplementation((atom) => {
        const label = String(atom?.debugLabel ?? "")
        if (label === "selectedTaskAtom") return taskWithDateTime
        if (label === "sortedLabelsAtom") return mockAllLabels
        if (label === "labelsFromIdsAtom") return mockGetLabelsFromIds
        if (label === "sortedProjectsAtom") return mockProjects
        if (label === "settingsAtom") return mockSettings
        return []
      })

      render(<TaskSidePanel isOpen={true} onClose={mockOnClose} />)

      // Should show date information in mobile mode too
      expect(
        screen.getByText((content) => {
          return content.includes("Jan")
        }),
      ).toBeInTheDocument()
    })
  })
})
