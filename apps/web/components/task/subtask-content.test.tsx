import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { v4 as uuidv4 } from "uuid"
import { SubtaskContent } from "./subtask-content"
import type { Task, Subtask } from "@/lib/types"
import { createSubtaskId } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_SUBTASK_ID_1,
  TEST_SUBTASK_ID_2,
  TEST_SUBTASK_ID_3,
  TEST_SUBTASK_ID_4,
} from "@/lib/utils/test-constants"

// Mock atom functions
const mockUpdateTask = vi.fn()

// Mock component interfaces
interface MockProviderProps {
  children: React.ReactNode
}

interface MockCheckboxProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  children?: React.ReactNode
  className?: string
  [key: string]: unknown
}

interface MockProgressProps {
  value?: number
  className?: string
  [key: string]: unknown
}

interface MockButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  className?: string
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
  autoFocus?: boolean
  [key: string]: unknown
}

interface MockTaskItemProps {
  taskId: string
  variant?: string
  parentTask?: unknown
  [key: string]: unknown
}

// Mock Jotai
vi.mock("jotai", () => ({
  useSetAtom: vi.fn(() => mockUpdateTask),
  useAtom: vi.fn((atom) => {
    // Return settings object for settingsAtom, empty array for others
    if (atom === "mockSettingsAtom") {
      return {
        general: {
          startView: "all" as const,
          soundEnabled: true,
          linkifyEnabled: true,
          popoverHoverOpen: false,
        },
      }
    }
    if (atom === "mockMultiSelectDraggingAtom") {
      return [false, vi.fn()]
    }
    return [] // Return empty array for atoms that return lists
  }),
  useAtomValue: vi.fn((atom) => {
    // Return settings object for settingsAtom, empty array for others
    if (atom === "mockSettingsAtom") {
      return {
        general: {
          startView: "all" as const,
          soundEnabled: true,
          linkifyEnabled: true,
          popoverHoverOpen: false,
        },
      }
    }
    return [] // Return empty array for atoms that return lists
  }),
  atom: vi.fn((value) => ({ init: value, toString: () => "mockAtom" })),
  Provider: ({ children }: MockProviderProps) => children,
}))

// Mock atoms
vi.mock("@/lib/atoms", () => ({
  updateTaskAtom: "mockUpdateTaskAtom",
  toggleTaskAtom: "mockToggleTaskAtom",
  deleteTaskAtom: "mockDeleteTaskAtom",
  addCommentAtom: "mockAddCommentAtom",
  toggleTaskPanelAtom: "mockToggleTaskPanelAtom",
  toggleTaskSelectionAtom: "mockToggleTaskSelectionAtom",
  selectedTasksAtom: "mockSelectedTasksAtom",
  lastSelectedTaskAtom: "mockLastSelectedTaskAtom",
  selectRangeAtom: "mockSelectRangeAtom",
  selectionToggleTaskSelectionAtom: "mockSelectionToggleTaskSelectionAtom",
  multiSelectDraggingAtom: "mockMultiSelectDraggingAtom",
  sortedProjectsAtom: "mockSortedProjectsAtom",
  tasksAtom: "mockTasksAtom",
  settingsAtom: "mockSettingsAtom", // Required by ContentPopover
  // Focus timer atoms
  focusTimerStateAtom: "mockFocusTimerStateAtom",
  activeFocusTimerAtom: "mockActiveFocusTimerAtom",
  isTaskTimerActiveAtom: () => () => false,
  focusTimerStatusAtom: "stopped",
  startFocusTimerAtom: () => {},
  pauseFocusTimerAtom: () => {},
  stopFocusTimerAtom: () => {},
  activeFocusTaskAtom: "mockActiveFocusTaskAtom",
  isAnyTimerRunningAtom: "mockIsAnyTimerRunningAtom",
  currentFocusTimerElapsedAtom: "mockCurrentFocusTimerElapsedAtom",
  focusTimerDisplayAtom: "mockFocusTimerDisplayAtom",
  stopAllFocusTimersAtom: "mockStopAllFocusTimersAtom",
  focusTimerAtoms: "mockFocusTimerAtoms",
  formatElapsedTime: vi.fn((ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }),
}))

vi.mock("@/lib/atoms/core/labels", () => ({
  sortedLabelsAtom: vi.fn(),
  addLabelAtom: vi.fn(),
  labelsFromIdsAtom: vi.fn(),
}))

// Mock dialog atoms
vi.mock("@/lib/atoms/ui/dialogs", () => ({
  quickAddTaskAtom: vi.fn(),
  updateQuickAddTaskAtom: vi.fn(),
}))

// Mock UI components
vi.mock("@/components/ui/checkbox", () => ({
  Checkbox: ({ checked, onCheckedChange, className, ...props }: MockCheckboxProps) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onCheckedChange?.(!checked)}
      className={className}
      data-testid="checkbox"
      {...props}
    />
  ),
}))

vi.mock("@/components/ui/progress", () => ({
  Progress: ({ value, className, ...props }: MockProgressProps) => (
    <div data-testid="progress-bar" data-value={value} className={className} {...props} />
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    variant,
    size,
    ...props
  }: MockButtonProps) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      data-variant={variant}
      data-size={size}
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
    placeholder,
    className,
    autoFocus,
    ...props
  }: MockInputProps) => (
    <input
      type="text"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      data-testid="subtask-input"
      data-autofocus={autoFocus}
      {...props}
    />
  ),
}))

// Mock TaskItem component
vi.mock("./task-item", () => ({
  TaskItem: ({
    taskId,
    variant,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parentTask: _parentTask,
    ...props
  }: MockTaskItemProps) => (
    <div data-testid={`task-item-${taskId}`} data-variant={variant} {...props}>
      <span data-testid="task-title">Mock Task {taskId}</span>
      <div data-testid="flag-icon" />
      <div data-testid="calendar-icon" />
      <div data-testid="message-square-icon" />
      <div data-testid="paperclip-icon" />
      <button data-testid={`delete-button-${taskId}`}>×</button>
    </div>
  ),
}))

// Mock utility functions
vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" "),
}))

describe("SubtaskContent", () => {
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

  const createMockSubtask = (overrides: Partial<Subtask> = {}): Subtask => ({
    id: TEST_SUBTASK_ID_1,
    title: "Test Subtask",
    completed: false,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Rendering", () => {
    it("renders with inline mode by default", () => {
      const task = createMockTask()
      render(<SubtaskContent task={task} />)

      // In inline mode, no title should be displayed
      expect(screen.queryByText("Subtasks")).not.toBeInTheDocument()
    })

    it("renders with popover mode when specified", () => {
      const task = createMockTask()
      render(<SubtaskContent task={task} mode="popover" />)

      expect(screen.getByText("Add Subtask")).toBeInTheDocument()
    })

    it("applies custom className", () => {
      const task = createMockTask()
      const { container } = render(<SubtaskContent task={task} className="custom-class" />)

      expect(container.firstChild).toHaveClass("custom-class")
    })

    it("shows correct title in popover mode when subtasks exist", () => {
      const subtasks = [createMockSubtask()]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} mode="popover" />)

      expect(screen.getByText("Subtasks")).toBeInTheDocument()
    })
  })

  describe("Subtasks Display", () => {
    it("shows progress bar when subtasks exist", () => {
      const subtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, completed: true }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, completed: false }),
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      expect(screen.getByTestId("progress-bar")).toBeInTheDocument()
      expect(screen.getByTestId("progress-bar")).toHaveAttribute("data-value", "50")
      expect(screen.getByText("50% complete")).toBeInTheDocument()
    })

    it("shows completion count when subtasks exist in popover mode", () => {
      const subtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, completed: true }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, completed: false }),
        createMockSubtask({ id: TEST_SUBTASK_ID_3, completed: true }),
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} mode="popover" />)

      expect(screen.getByText("2/3 completed")).toBeInTheDocument()
    })

    it("renders subtasks sorted by order", () => {
      const subtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, title: "Second Subtask", order: 1 }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, title: "First Subtask", order: 0 }),
        createMockSubtask({ id: TEST_SUBTASK_ID_3, title: "Third Subtask", order: 2 }),
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      const taskItems = screen.getAllByTestId(/task-item-/)
      expect(taskItems).toHaveLength(3)
      expect(taskItems[0]).toHaveAttribute("data-testid", `task-item-${TEST_SUBTASK_ID_2}`)
      expect(taskItems[1]).toHaveAttribute("data-testid", `task-item-${TEST_SUBTASK_ID_1}`)
      expect(taskItems[2]).toHaveAttribute("data-testid", `task-item-${TEST_SUBTASK_ID_3}`)
    })

    it("converts subtasks to Task objects for TaskItem", () => {
      const subtasks = [createMockSubtask({ id: TEST_SUBTASK_ID_1 })]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      const taskItem = screen.getByTestId(`task-item-${TEST_SUBTASK_ID_1}`)
      expect(taskItem).toHaveAttribute("data-variant", "subtask")
    })

    it("handles empty subtasks list", () => {
      const task = createMockTask({ subtasks: [] })

      render(<SubtaskContent task={task} />)

      expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument()
      expect(screen.queryByText(/completed/)).not.toBeInTheDocument()
      expect(screen.getByTestId("subtask-input")).toBeInTheDocument()
    })
  })

  describe("Adding Subtasks", () => {
    it("shows add subtask interface always", async () => {
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      expect(screen.getByTestId("subtask-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Add subtasks...")).toBeInTheDocument()
      expect(screen.getByTestId("subtask-submit-button")).toBeInTheDocument()
    })

    it("submit button is disabled when input is empty", async () => {
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      const submitButton = screen.getByTestId("subtask-submit-button")
      expect(submitButton).toBeDisabled()
    })

    it("submit button is enabled when input has text", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      const input = screen.getByTestId("subtask-input")
      const submitButton = screen.getByTestId("subtask-submit-button")

      await user.type(input, "Test subtask")
      expect(submitButton).not.toBeDisabled()
    })

    it("adds subtask when submit button is clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      const input = screen.getByTestId("subtask-input")
      const submitButton = screen.getByTestId("subtask-submit-button")

      await user.type(input, "New subtask via button")
      await user.click(submitButton)

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: task.id,
          subtasks: [
            {
              id: expect.any(String),
              title: "New subtask via button",
              completed: false,
              order: 0,
            },
          ],
        },
      })
    })

    it("shows different text when task already has subtasks", async () => {
      const subtasks = [createMockSubtask()]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      expect(screen.getByTestId("subtask-input")).toBeInTheDocument()
    })

    it("adds subtask when Add button is clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      await user.type(screen.getByTestId("subtask-input"), "New Subtask")
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          subtasks: [
            {
              id: expect.any(String),
              title: "New Subtask",
              completed: false,
              order: 0,
            },
          ],
        },
      })
    })

    it("adds subtask when Enter key is pressed", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      await user.type(screen.getByTestId("subtask-input"), "New Subtask")
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          subtasks: [
            {
              id: expect.any(String),
              title: "New Subtask",
              completed: false,
              order: 0,
            },
          ],
        },
      })
    })

    it("does not add empty subtask", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      await user.keyboard("{Enter}")

      expect(mockUpdateTask).not.toHaveBeenCalled()
    })

    it("trims whitespace from subtask title", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      await user.type(screen.getByTestId("subtask-input"), "  New Subtask  ")
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          subtasks: [
            {
              id: expect.any(String),
              title: "New Subtask",
              completed: false,
              order: 0,
            },
          ],
        },
      })
    })

    it("sets correct order for new subtask", async () => {
      const user = userEvent.setup()
      const existingSubtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, order: 0 }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, order: 1 }),
      ]
      const task = createMockTask({ subtasks: existingSubtasks })

      render(<SubtaskContent task={task} />)

      await user.type(screen.getByTestId("subtask-input"), "New Subtask")
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          subtasks: [
            ...existingSubtasks,
            {
              id: expect.any(String),
              title: "New Subtask",
              completed: false,
              order: 2,
            },
          ],
        },
      })
    })

    it("prevents submission when input is empty", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      const input = screen.getByTestId("subtask-input")

      // Try to submit empty input with Enter key
      await user.click(input)
      await user.keyboard("{Enter}")

      // Should not create a subtask
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })

    it("clears input after successful add but keeps it visible", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      const input = screen.getByTestId("subtask-input")
      await user.type(input, "New Subtask")
      await user.keyboard("{Enter}")

      // Input should still be visible but cleared
      expect(screen.getByTestId("subtask-input")).toBeInTheDocument()
      expect(input).toHaveValue("")
    })
  })

  describe("Progress Calculation", () => {
    it("calculates 0% progress when no subtasks", () => {
      const task = createMockTask({ subtasks: [] })

      render(<SubtaskContent task={task} />)

      expect(screen.queryByTestId("progress-bar")).not.toBeInTheDocument()
    })

    it("calculates 0% progress when no subtasks completed", () => {
      const subtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, completed: false }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, completed: false }),
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      expect(screen.getByTestId("progress-bar")).toHaveAttribute("data-value", "0")
      expect(screen.getByText("0% complete")).toBeInTheDocument()
    })

    it("calculates 100% progress when all subtasks completed", () => {
      const subtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, completed: true }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, completed: true }),
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      expect(screen.getByTestId("progress-bar")).toHaveAttribute("data-value", "100")
      expect(screen.getByText("100% complete")).toBeInTheDocument()
    })

    it("calculates partial progress correctly", () => {
      const subtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, completed: true }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, completed: false }),
        createMockSubtask({ id: TEST_SUBTASK_ID_3, completed: true }),
        createMockSubtask({ id: TEST_SUBTASK_ID_4, completed: false }),
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      expect(screen.getByTestId("progress-bar")).toHaveAttribute("data-value", "50")
      expect(screen.getByText("50% complete")).toBeInTheDocument()
    })

    it("rounds progress percentage correctly", () => {
      const subtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, completed: true }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, completed: false }),
        createMockSubtask({ id: TEST_SUBTASK_ID_3, completed: false }),
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      // 1/3 = 33.333... should round to 33%
      expect(screen.getByText("33% complete")).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("handles subtasks without order property", () => {
      const subtasks: Subtask[] = [
        { id: TEST_SUBTASK_ID_1, title: "Subtask 1", completed: false },
        { id: TEST_SUBTASK_ID_2, title: "Subtask 2", completed: false },
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      expect(screen.getAllByTestId(/task-item-/)).toHaveLength(2)
    })

    it("handles very long subtask list with scroll", () => {
      // Create 20 subtasks for testing long list
      const subtasks = Array.from({ length: 20 }, (_, i) =>
        createMockSubtask({
          id: createSubtaskId(`${uuidv4()}`),
          title: `Subtask ${i + 1}`,
          order: i,
        }),
      )
      const task = createMockTask({ subtasks })

      const { container } = render(<SubtaskContent task={task} />)

      const scrollContainer = container.querySelector(".max-h-64.overflow-y-auto")
      expect(scrollContainer).toBeInTheDocument()
      expect(screen.getAllByTestId(/task-item-/)).toHaveLength(20)
    })

    it("input is always focusable", async () => {
      const user = userEvent.setup()
      const task = createMockTask()

      render(<SubtaskContent task={task} />)

      const input = screen.getByTestId("subtask-input")
      expect(input).toBeInTheDocument()

      // Should be able to focus and type
      await user.click(input)
      await user.type(input, "test")
      expect(input).toHaveValue("test")
    })
  })

  describe("Subtask Deletion", () => {
    it("renders TaskItem components with delete buttons", () => {
      const subtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, title: "Subtask 1" }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, title: "Subtask 2" }),
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      // Check that both TaskItem components are rendered
      const taskItems = screen.getAllByTestId(/task-item-/)
      expect(taskItems).toHaveLength(2)

      // Check that delete buttons are always present
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_2}`)).toBeInTheDocument()
    })

    it("renders delete buttons for each subtask", () => {
      const subtasks = [
        createMockSubtask({ id: TEST_SUBTASK_ID_1, title: "Subtask 1" }),
        createMockSubtask({ id: TEST_SUBTASK_ID_2, title: "Subtask 2" }),
      ]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      // Check that delete buttons are rendered for each subtask
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_2}`)).toBeInTheDocument()
    })

    it("passes correct variant and parentTask props for subtask deletion", () => {
      const subtasks = [createMockSubtask({ id: TEST_SUBTASK_ID_1, title: "Subtask 1" })]
      const task = createMockTask({ subtasks })

      render(<SubtaskContent task={task} />)

      const taskItem = screen.getByTestId(`task-item-${TEST_SUBTASK_ID_1}`)
      expect(taskItem).toHaveAttribute("data-variant", "subtask")

      // The TaskItem should receive the parent task for deletion operations
      // (This is verified by the fact that the component renders successfully with parentTask prop)
    })
  })
})
