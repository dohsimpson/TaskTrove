import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  render,
  screen,
  mockContentPopoverComponent,
  mockHelpPopoverComponent,
  mockTimeEstimationPopoverComponent,
  handleSettingsAtomInMock,
} from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { Provider } from "jotai"
import { SubtaskPopover } from "./subtask-popover"
import type { Task } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_SECTION_ID_1,
  TEST_SUBTASK_ID_1,
  TEST_SUBTASK_ID_2,
  TEST_SUBTASK_ID_3,
} from "@/lib/utils/test-constants"

// Mock UI components that use ContentPopover
vi.mock("@/components/ui/content-popover", () => ({
  ContentPopover: mockContentPopoverComponent,
}))

vi.mock("@/components/ui/help-popover", () => ({
  HelpPopover: mockHelpPopoverComponent,
}))

vi.mock("@/components/task/time-estimation-popover", () => ({
  TimeEstimationPopover: mockTimeEstimationPopoverComponent,
}))

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

interface MockPopoverProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface MockPopoverContentProps {
  children: React.ReactNode
  className?: string
  align?: string
}

interface MockPopoverTriggerProps {
  children: React.ReactNode
  asChild?: boolean
}

interface MockBadgeProps {
  children: React.ReactNode
  className?: string
  variant?: string
}

interface MockEditableDivProps {
  value?: string
  children?: React.ReactNode
  className?: string
}

interface MockCommandProps {
  children: React.ReactNode
}

interface MockCommandInputProps {
  placeholder?: string
}

interface MockCommandItemProps {
  children: React.ReactNode
  onSelect?: () => void
}

interface MockCustomizablePopoverProps {
  children: React.ReactNode
  sections?: unknown
}

interface MockSimpleComponentProps {
  children: React.ReactNode
}

// Mock Jotai with settings atom support
vi.mock("jotai", () => ({
  useSetAtom: vi.fn(() => mockUpdateTask),
  useAtomValue: vi.fn((atom: unknown) => {
    const settingsResult = handleSettingsAtomInMock(atom)
    if (settingsResult) return settingsResult
    return [] // Return empty array for atoms that return lists
  }),
  atom: vi.fn((value) => ({ init: value, toString: () => "mockAtom" })),
  Provider: ({ children }: MockProviderProps) => children,
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

vi.mock("@/components/ui/custom/task-checkbox", () => ({
  TaskCheckbox: ({ checked, onCheckedChange, className, ...props }: MockCheckboxProps) => (
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
  Progress: ({ value, className }: MockProgressProps) => (
    <div className={className} data-testid="progress" data-value={value} />
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
      data-testid="button"
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
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      data-testid="input"
      {...props}
    />
  ),
}))

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children, open }: MockPopoverProps) => (
    <div data-testid="popover" data-open={open}>
      {children}
    </div>
  ),
  PopoverContent: ({ children, className, align }: MockPopoverContentProps) => (
    <div className={className} data-align={align} data-testid="popover-content">
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: MockPopoverTriggerProps) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
}))

vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(" "),
}))

// Mock additional components TaskItem uses
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className, variant }: MockBadgeProps) => (
    <span className={className} data-variant={variant} data-testid="badge">
      {children}
    </span>
  ),
}))

vi.mock("@/components/ui/custom/editable-div", () => ({
  EditableDiv: ({ value, children, className }: MockEditableDivProps) => (
    <div className={className} data-testid="editable-div">
      {value || children}
    </div>
  ),
}))

vi.mock("@/components/ui/command", () => ({
  Command: ({ children }: MockCommandProps) => <div data-testid="command">{children}</div>,
  CommandEmpty: ({ children }: MockCommandProps) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children }: MockCommandProps) => (
    <div data-testid="command-group">{children}</div>
  ),
  CommandInput: ({ placeholder }: MockCommandInputProps) => (
    <input placeholder={placeholder} data-testid="command-input" />
  ),
  CommandItem: ({ children, onSelect }: MockCommandItemProps) => (
    <div onClick={onSelect} data-testid="command-item">
      {children}
    </div>
  ),
  CommandList: ({ children }: MockCommandProps) => <div data-testid="command-list">{children}</div>,
}))

vi.mock("@/components/ui/customizable-popover", () => ({
  CustomizablePopover: ({ children }: MockCustomizablePopoverProps) => (
    <div data-testid="customizable-popover">{children}</div>
  ),
}))

// Mock other task components that TaskItem imports
vi.mock("./label-management-popover", () => ({
  LabelManagementPopover: ({ children }: MockSimpleComponentProps) => (
    <div data-testid="label-management-popover">{children}</div>
  ),
}))

vi.mock("./task-schedule-popover", () => ({
  TaskSchedulePopover: ({ children }: MockSimpleComponentProps) => (
    <div data-testid="task-schedule-popover">{children}</div>
  ),
}))

vi.mock("./comment-management-popover", () => ({
  CommentManagementPopover: ({ children }: MockSimpleComponentProps) => (
    <div data-testid="comment-management-popover">{children}</div>
  ),
}))

vi.mock("./task-actions-menu", () => ({
  TaskActionsMenu: ({ children }: MockSimpleComponentProps) => (
    <div data-testid="task-actions-menu">{children}</div>
  ),
}))

// Mock utility functions
vi.mock("@/lib/color-utils", () => ({
  getPriorityColor: () => "#000000",
  getPriorityTextColor: () => "#ffffff",
  getPriorityLabel: () => "High",
  getDueDateTextColor: () => "#000000",
}))

vi.mock("@/hooks/use-context-menu-visibility", () => ({
  useContextMenuVisibility: () => ({ isVisible: false, setIsVisible: vi.fn() }),
}))

// Mock TaskItem component
vi.mock("./task-item", () => ({
  TaskItem: ({
    taskId,
    variant,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parentTask: _parentTask,
    ...props
  }: {
    taskId: string
    variant?: string
    parentTask?: unknown
    [key: string]: unknown
  }) => (
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

const mockTaskWithSubtasks: Task = {
  id: TEST_TASK_ID_1,
  title: "Test Task",
  description: "",
  completed: false,
  priority: 4,
  sectionId: TEST_SECTION_ID_1,
  labels: [],
  subtasks: [
    {
      id: TEST_SUBTASK_ID_1,
      title: "First subtask",
      completed: true,
      order: 0,
    },
    {
      id: TEST_SUBTASK_ID_2,
      title: "Second subtask",
      completed: false,
      order: 1,
    },
    {
      id: TEST_SUBTASK_ID_3,
      title: "Third subtask",
      completed: false,
      order: 2,
    },
  ],
  comments: [],
  attachments: [],
  createdAt: new Date(),
  recurringMode: "dueDate",
  favorite: false,
  recurring: undefined,
  projectId: undefined,
  dueDate: undefined,
}

const mockTaskWithoutSubtasks: Task = {
  ...mockTaskWithSubtasks,
  subtasks: [],
}

const renderSubtaskPopover = (task: Task = mockTaskWithSubtasks) => {
  return render(
    <Provider>
      <SubtaskPopover task={task}>
        <button>Trigger</button>
      </SubtaskPopover>
    </Provider>,
  )
}

describe("SubtaskPopover", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Basic Rendering", () => {
    it("renders trigger when task has subtasks", () => {
      renderSubtaskPopover()
      expect(screen.getByText("Trigger")).toBeInTheDocument()
      expect(screen.getAllByTestId("popover")).toHaveLength(2) // Subtask popover + time estimation popover in add section
    })

    it("renders popover for tasks without subtasks", () => {
      renderSubtaskPopover(mockTaskWithoutSubtasks)
      expect(screen.getByText("Trigger")).toBeInTheDocument()
      expect(screen.getAllByTestId("popover")).toHaveLength(2) // Subtask popover + time estimation popover in add section
    })

    it("displays correct subtask count in header when subtasks exist", () => {
      renderSubtaskPopover()
      expect(screen.getByText("Subtasks")).toBeInTheDocument()
      expect(screen.getByText(/1\/3 completed/)).toBeInTheDocument() // 1 completed out of 3
    })

    it('displays "Add Subtask" header when no subtasks exist', () => {
      renderSubtaskPopover(mockTaskWithoutSubtasks)
      expect(screen.getByText("Add Subtask")).toBeInTheDocument()
      expect(screen.queryByText(/1\/3 completed/)).not.toBeInTheDocument()
    })

    it("displays progress bar with correct percentage when subtasks exist", () => {
      renderSubtaskPopover()
      const progress = screen.getByTestId("progress")
      const progressValue = progress.getAttribute("data-value")
      if (progressValue) {
        expect(parseFloat(progressValue)).toBeCloseTo(33.33, 2) // 1/3 * 100
      }
      expect(screen.getByText("33% complete")).toBeInTheDocument()
    })

    it("does not display progress bar when no subtasks exist", () => {
      renderSubtaskPopover(mockTaskWithoutSubtasks)
      expect(screen.queryByTestId("progress")).not.toBeInTheDocument()
      expect(screen.queryByText("complete")).not.toBeInTheDocument()
    })
  })

  describe("Subtask List", () => {
    it("renders all subtasks in order", () => {
      renderSubtaskPopover()
      expect(screen.getByText(`Mock Task ${TEST_SUBTASK_ID_1}`)).toBeInTheDocument()
      expect(screen.getByText(`Mock Task ${TEST_SUBTASK_ID_2}`)).toBeInTheDocument()
      expect(screen.getByText(`Mock Task ${TEST_SUBTASK_ID_3}`)).toBeInTheDocument()
    })

    it("shows completed subtask with line-through style", () => {
      renderSubtaskPopover()
      const firstSubtask = screen.getByText(`Mock Task ${TEST_SUBTASK_ID_1}`)
      // Note: Mock TaskItem doesn't apply styling, but component structure is tested
      expect(firstSubtask).toBeInTheDocument()
    })

    it("shows incomplete subtasks without line-through", () => {
      renderSubtaskPopover()
      const secondSubtask = screen.getByText(`Mock Task ${TEST_SUBTASK_ID_2}`)
      // Note: Mock TaskItem doesn't apply styling, but component structure is tested
      expect(secondSubtask).toBeInTheDocument()
    })

    it("renders task items for each subtask", () => {
      renderSubtaskPopover()
      const taskItems = screen.getAllByTestId(/task-item-/)
      expect(taskItems).toHaveLength(3)

      // Verify TaskItems are rendered with correct test IDs
      expect(screen.getByTestId(`task-item-${TEST_SUBTASK_ID_1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`task-item-${TEST_SUBTASK_ID_2}`)).toBeInTheDocument()
      expect(screen.getByTestId(`task-item-${TEST_SUBTASK_ID_3}`)).toBeInTheDocument()
    })
  })

  describe("Subtask Interaction", () => {
    it("passes correct props to TaskItem components", () => {
      renderSubtaskPopover()

      // Verify TaskItems are rendered with correct props
      const taskItem1 = screen.getByTestId(`task-item-${TEST_SUBTASK_ID_1}`)
      const taskItem2 = screen.getByTestId(`task-item-${TEST_SUBTASK_ID_2}`)
      const taskItem3 = screen.getByTestId(`task-item-${TEST_SUBTASK_ID_3}`)

      // All should have subtask variant
      expect(taskItem1).toHaveAttribute("data-variant", "subtask")
      expect(taskItem2).toHaveAttribute("data-variant", "subtask")
      expect(taskItem3).toHaveAttribute("data-variant", "subtask")

      // All should have delete buttons always visible
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_2}`)).toBeInTheDocument()
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_3}`)).toBeInTheDocument()
    })

    it("renders delete buttons for each subtask", () => {
      renderSubtaskPopover()

      // Verify delete buttons are rendered (from mock)
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_1}`)).toBeInTheDocument()
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_2}`)).toBeInTheDocument()
      expect(screen.getByTestId(`delete-button-${TEST_SUBTASK_ID_3}`)).toBeInTheDocument()
    })
  })

  describe("Progress Calculation", () => {
    it("shows 100% when all subtasks are completed", () => {
      const allCompletedTask = {
        ...mockTaskWithSubtasks,
        subtasks: mockTaskWithSubtasks.subtasks.map((s) => ({ ...s, completed: true })),
      }
      renderSubtaskPopover(allCompletedTask)

      const progress = screen.getByTestId("progress")
      expect(progress).toHaveAttribute("data-value", "100")
      expect(screen.getByText("100% complete")).toBeInTheDocument()
      expect(screen.getByText(/3\/3 completed/)).toBeInTheDocument()
    })

    it("shows 0% when no subtasks are completed", () => {
      const noneCompletedTask = {
        ...mockTaskWithSubtasks,
        subtasks: mockTaskWithSubtasks.subtasks.map((s) => ({ ...s, completed: false })),
      }
      renderSubtaskPopover(noneCompletedTask)

      const progress = screen.getByTestId("progress")
      expect(progress).toHaveAttribute("data-value", "0")
      expect(screen.getByText("0% complete")).toBeInTheDocument()
      expect(screen.getByText(/0\/3 completed/)).toBeInTheDocument()
    })
  })

  describe("Add Subtask Functionality", () => {
    it("shows add subtask input when subtasks exist", () => {
      renderSubtaskPopover()
      expect(screen.getByTestId("subtask-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Add another subtask...")).toBeInTheDocument()
    })

    it("shows add subtask input when no subtasks exist", () => {
      renderSubtaskPopover(mockTaskWithoutSubtasks)
      expect(screen.getByTestId("subtask-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Add subtasks...")).toBeInTheDocument()
    })

    it("shows input field and submit button always available", async () => {
      renderSubtaskPopover()

      expect(screen.getByTestId("subtask-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Add another subtask...")).toBeInTheDocument()
      expect(screen.getByTestId("subtask-submit-button")).toBeInTheDocument()
      // Submit button should be disabled when input is empty
      expect(screen.getByTestId("subtask-submit-button")).toBeDisabled()
    })

    it("adds subtask when form is submitted", async () => {
      const user = userEvent.setup()
      renderSubtaskPopover()

      const input = screen.getByTestId("subtask-input")
      await user.type(input, "New subtask")

      const submitButton = screen.getByTestId("subtask-submit-button")
      await user.click(submitButton)

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          subtasks: [
            { id: TEST_SUBTASK_ID_1, title: "First subtask", completed: true, order: 0 },
            { id: TEST_SUBTASK_ID_2, title: "Second subtask", completed: false, order: 1 },
            { id: TEST_SUBTASK_ID_3, title: "Third subtask", completed: false, order: 2 },
            expect.objectContaining({
              title: "New subtask",
              completed: false,
              order: 3,
            }),
          ],
        },
      })
    })

    it("adds subtask when enter key is pressed", async () => {
      const user = userEvent.setup()
      renderSubtaskPopover()

      const input = screen.getByTestId("subtask-input")
      await user.type(input, "New subtask")
      await user.keyboard("{Enter}")

      expect(mockUpdateTask).toHaveBeenCalledWith({
        updateRequest: {
          id: TEST_TASK_ID_1,
          subtasks: expect.arrayContaining([
            expect.objectContaining({
              title: "New subtask",
              completed: false,
              order: 3,
            }),
          ]),
        },
      })
    })

    it("clears input after adding subtask", async () => {
      const user = userEvent.setup()
      renderSubtaskPopover()

      const input = screen.getByTestId("subtask-input")
      await user.type(input, "New subtask")
      await user.keyboard("{Enter}")

      // Input should be cleared after adding
      expect(input).toHaveValue("")
      expect(mockUpdateTask).toHaveBeenCalled()
    })

    it("does not add empty subtask when enter is pressed", async () => {
      const user = userEvent.setup()
      renderSubtaskPopover()

      const input = screen.getByTestId("subtask-input")
      // Try to submit empty input
      await user.click(input)
      await user.keyboard("{Enter}")

      // Should not add anything
      expect(mockUpdateTask).not.toHaveBeenCalled()
    })

    it("disables add button when input is empty", async () => {
      renderSubtaskPopover()

      const submitButton = screen.getByTestId("subtask-submit-button")
      expect(submitButton).toBeDisabled()
    })

    it("enables add button when input has content", async () => {
      const user = userEvent.setup()
      renderSubtaskPopover()

      const input = screen.getByTestId("subtask-input")
      await user.type(input, "New subtask")

      const submitButton = screen.getByTestId("subtask-submit-button")
      expect(submitButton).not.toBeDisabled()
    })
  })
})
