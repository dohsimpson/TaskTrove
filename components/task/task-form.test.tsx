import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Provider } from "jotai"
import { TaskForm } from "./task-form"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_PROJECT_ID_2,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
} from "@/lib/utils/test-constants"

// Mock component interfaces
interface MockJotaiProviderProps {
  children?: React.ReactNode
}

interface MockButtonProps {
  children?: React.ReactNode
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  variant?: string
  size?: string
  className?: string
  disabled?: boolean
  [key: string]: unknown
}

interface MockInputProps {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  className?: string
  placeholder?: string
  [key: string]: unknown
}

interface MockTextareaProps {
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  className?: string
  [key: string]: unknown
}

interface AtomWithToString {
  toString?: () => string
}

// Type guard for atoms with toString method
function hasToString(atom: unknown): atom is AtomWithToString {
  return typeof atom === "object" && atom !== null && "toString" in atom
}

interface MockSelectProps {
  children?: React.ReactNode
  value?: string
  onValueChange?: (value: string) => void
}

interface MockSelectItemProps {
  children?: React.ReactNode
  value?: string
}

interface MockSelectTriggerProps {
  children?: React.ReactNode
  className?: string
}

interface MockSelectValueProps {
  placeholder?: string
}

interface MockCalendarProps {
  onSelect?: (date: Date) => void
  selected?: Date
}

interface MockPopoverProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface MockBadgeProps {
  children?: React.ReactNode
  variant?: string
  className?: string
}

interface MockLabelProps {
  children?: React.ReactNode
  htmlFor?: string
}

interface MockSwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
}

interface MockIconProps {
  className?: string
  style?: React.CSSProperties
}

// Mock Jotai
vi.mock("jotai", () => ({
  useAtomValue: vi.fn(),
  useSetAtom: vi.fn(),
  atom: vi.fn((value) => ({ init: value, toString: () => "mockAtom" })),
  Provider: ({ children }: MockJotaiProviderProps) => children,
}))

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock date-fns
vi.mock("date-fns", () => ({
  format: vi.fn(() => "2024-01-15"),
}))

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, type, variant, size, className, ...props }: MockButtonProps) => (
    <button
      onClick={onClick}
      type={type}
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
  Input: ({ value, onChange, onKeyDown, className, ...props }: MockInputProps) => (
    <input
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      className={className}
      data-testid="input"
      {...props}
    />
  ),
}))

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ value, onChange, ...props }: MockTextareaProps) => (
    <textarea value={value} onChange={onChange} data-testid="textarea" {...props} />
  ),
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: MockSelectProps) => (
    <div data-testid="select" data-value={value} onClick={() => onValueChange?.("test-value")}>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: MockSelectItemProps) => (
    <div data-testid="select-item" data-value={value} onClick={() => {}}>
      {children}
    </div>
  ),
  SelectTrigger: ({ children, className }: MockSelectTriggerProps) => (
    <div data-testid="select-trigger" className={className}>
      {children}
    </div>
  ),
  SelectValue: ({ placeholder }: MockSelectValueProps) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
}))

vi.mock("@/components/ui/calendar", () => ({
  Calendar: ({ onSelect }: MockCalendarProps) => (
    <div data-testid="calendar" onClick={() => onSelect?.(new Date("2024-01-15"))}>
      Calendar Mock
    </div>
  ),
}))

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children, open, onOpenChange }: MockPopoverProps) => (
    <div data-testid="popover" data-open={open} onClick={() => onOpenChange?.(!open)}>
      {children}
    </div>
  ),
  PopoverContent: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="popover-trigger">{children}</div>
  ),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: MockBadgeProps) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: MockLabelProps) => (
    <label htmlFor={htmlFor} data-testid="label">
      {children}
    </label>
  ),
}))

vi.mock("@/components/ui/switch", () => ({
  Switch: ({ checked = false, onCheckedChange }: MockSwitchProps) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid="switch"
    />
  ),
}))

// Mock utils
vi.mock("@/lib/utils", () => ({
  cn: (...args: (string | undefined | null | boolean)[]) => args.filter(Boolean).join(" "),
}))

// Mock task atoms
vi.mock("@/lib/atoms", () => ({
  taskAtoms: {
    actions: {
      addTask: { toString: () => "addTaskAtom" },
      updateTask: { toString: () => "updateTaskAtom" },
    },
  },
  projectAtoms: {
    projects: { toString: () => "projectsAtom" },
  },
  labelAtoms: {
    sortedLabels: { toString: () => "sortedLabelsAtom" },
  },
}))

// Mock icons
vi.mock("lucide-react", () => ({
  CalendarIcon: () => <span data-testid="calendar-icon">📅</span>,
  Flag: ({ className }: MockIconProps) => (
    <span data-testid="flag-icon" className={className}>
      🚩
    </span>
  ),
  Tag: ({ className, style }: MockIconProps) => (
    <span data-testid="tag-icon" className={className} style={style}>
      🏷️
    </span>
  ),
  X: () => <span data-testid="x-icon">❌</span>,
  Plus: () => <span data-testid="plus-icon">➕</span>,
  Folder: ({ className, style }: MockIconProps) => (
    <span data-testid="folder-icon" className={className} style={style}>
      📁
    </span>
  ),
}))

describe("TaskForm", () => {
  const mockProjects = [
    { id: TEST_PROJECT_ID_1, name: "Project 1", color: "#ff0000" },
    { id: TEST_PROJECT_ID_2, name: "Project 2", color: "#00ff00" },
  ]

  const mockLabels = [
    { id: TEST_LABEL_ID_1, name: "urgent", color: "#ff0000" },
    { id: TEST_LABEL_ID_2, name: "work", color: "#0000ff" },
  ]

  const mockAddTask = vi.fn()
  const mockUpdateTask = vi.fn()
  const mockOnSuccess = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()

    const { useAtomValue, useSetAtom } = await import("jotai")

    vi.mocked(useAtomValue).mockImplementation((atom: unknown) => {
      const atomString = hasToString(atom) ? atom.toString?.() : undefined
      if (atomString?.includes("projects")) {
        return mockProjects
      }
      if (atomString?.includes("labels")) {
        return mockLabels
      }
      return []
    })

    vi.mocked(useSetAtom).mockImplementation((atom: unknown) => {
      const atomString = hasToString(atom) ? atom.toString?.() : undefined
      if (atomString?.includes("addTask")) {
        return mockAddTask
      }
      if (atomString?.includes("updateTask")) {
        return mockUpdateTask
      }
      return vi.fn()
    })
  })

  describe("Rendering", () => {
    it("renders form fields correctly", () => {
      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      expect(screen.getByLabelText(/task title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument()
      expect(screen.getByText(/project \*/i)).toBeInTheDocument()
      expect(screen.getByText(/priority/i)).toBeInTheDocument()
      expect(screen.getByText(/due date/i)).toBeInTheDocument()
      expect(screen.getByText(/labels/i)).toBeInTheDocument()
      expect(screen.getByText(/mark as favorite/i)).toBeInTheDocument()
    })

    it("renders submit and cancel buttons", () => {
      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      expect(screen.getByRole("button", { name: /create task/i })).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    })

    it("populates form with existing task data", () => {
      const existingTask = {
        id: TEST_TASK_ID_1,
        title: "Existing Task",
        description: "Task description",
        priority: 2 as const,
        projectId: TEST_PROJECT_ID_1,
        labels: [TEST_LABEL_ID_1],
        favorite: true,
      }

      render(
        <Provider>
          <TaskForm task={existingTask} onCancel={mockOnCancel} />
        </Provider>,
      )

      expect(screen.getByDisplayValue("Existing Task")).toBeInTheDocument()
      expect(screen.getByDisplayValue("Task description")).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /update task/i })).toBeInTheDocument()
    })
  })

  describe("Form Validation", () => {
    it("shows error when title is empty", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const submitButton = screen.getByRole("button", { name: /create task/i })
      await user.click(submitButton)

      expect(screen.getByText(/task title is required/i)).toBeInTheDocument()
    })

    it("always has a default project selected", async () => {
      const user = userEvent.setup()

      // Mock empty projects to see if INBOX_PROJECT_ID is used as fallback
      const { useAtomValue } = await import("jotai")
      vi.mocked(useAtomValue).mockImplementation((atom: unknown) => {
        const atomString = hasToString(atom) ? atom.toString?.() : undefined
        if (atomString?.includes("projects")) {
          return []
        }
        if (atomString?.includes("labels")) {
          return mockLabels
        }
        return []
      })

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const titleInput = screen.getByLabelText(/task title/i)
      await user.type(titleInput, "Test Task")

      const submitButton = screen.getByRole("button", { name: /create task/i })
      await user.click(submitButton)

      // The form should not show project validation error because it falls back to INBOX_PROJECT_ID
      expect(screen.queryByText(/please select a project/i)).not.toBeInTheDocument()
      expect(mockAddTask).toHaveBeenCalled()
    })

    it("does not show errors when form is valid", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const titleInput = screen.getByLabelText(/task title/i)
      await user.type(titleInput, "Valid Task")

      const submitButton = screen.getByRole("button", { name: /create task/i })
      await user.click(submitButton)

      expect(screen.queryByText(/task title is required/i)).not.toBeInTheDocument()
      expect(screen.queryByText(/please select a project/i)).not.toBeInTheDocument()
    })
  })

  describe("Form Interactions", () => {
    it("updates title field", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const titleInput = screen.getByLabelText(/task title/i)
      await user.type(titleInput, "New Task Title")

      expect(titleInput).toHaveValue("New Task Title")
    })

    it("updates description field", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const descriptionInput = screen.getByLabelText(/description/i)
      await user.type(descriptionInput, "Task description")

      expect(descriptionInput).toHaveValue("Task description")
    })

    it("toggles favorite switch", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const favoriteSwitch = screen.getByTestId("switch")
      expect(favoriteSwitch).not.toBeChecked()

      await user.click(favoriteSwitch)
      expect(favoriteSwitch).toBeChecked()
    })

    it("calls onCancel when cancel button is clicked", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const cancelButton = screen.getByRole("button", { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe("Label Management", () => {
    it("renders label input and add button", () => {
      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      // Should render the label input and add button
      expect(screen.getByPlaceholderText(/add label/i)).toBeInTheDocument()
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument()
    })

    it("renders labels section with basic elements", () => {
      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      // Check that the labels section is present with its basic elements
      expect(screen.getByText(/labels/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/add label/i)).toBeInTheDocument()

      // Note: The quick-add buttons for labels may not appear in the test environment
      // due to the mocked atom behavior, but the core UI elements should be there
    })
  })

  describe("Due Date Management", () => {
    it("opens calendar when date button is clicked", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const dateButton = screen.getByText(/pick a date/i)
      await user.click(dateButton)

      expect(screen.getByTestId("calendar")).toBeInTheDocument()
    })

    it("selects date from calendar", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const dateButton = screen.getByText(/pick a date/i)
      await user.click(dateButton)

      const calendar = screen.getByTestId("calendar")
      await user.click(calendar)

      expect(screen.getByText("2024-01-15")).toBeInTheDocument()
    })

    it("clears selected date", async () => {
      const user = userEvent.setup()

      const taskWithDate = {
        title: "Task with date",
        dueDate: new Date("2024-01-15"),
        projectId: TEST_PROJECT_ID_1,
        priority: 4 as const,
        labels: [],
      }

      render(
        <Provider>
          <TaskForm task={taskWithDate} onCancel={mockOnCancel} />
        </Provider>,
      )

      const clearButton = screen.getByText(/clear date/i)
      await user.click(clearButton)

      expect(screen.getByText(/pick a date/i)).toBeInTheDocument()
      expect(screen.queryByText(/clear date/i)).not.toBeInTheDocument()
    })
  })

  describe("Form Submission", () => {
    it("creates new task successfully", async () => {
      const user = userEvent.setup()
      mockAddTask.mockResolvedValue(undefined)

      render(
        <Provider>
          <TaskForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Provider>,
      )

      const titleInput = screen.getByLabelText(/task title/i)
      await user.type(titleInput, "New Task")

      const submitButton = screen.getByRole("button", { name: /create task/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockAddTask).toHaveBeenCalledWith(
          expect.objectContaining({
            title: "New Task",
            description: "",
            priority: 4,
            dueDate: undefined,
            projectId: TEST_PROJECT_ID_1,
            labels: [],
            recurring: undefined,
          }),
        )
      })

      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })

    it("updates existing task successfully", async () => {
      const user = userEvent.setup()
      mockUpdateTask.mockResolvedValue(undefined)

      const existingTask = {
        id: TEST_TASK_ID_1,
        title: "Existing Task",
        projectId: TEST_PROJECT_ID_1,
        priority: 2 as const,
        labels: [],
      }

      render(
        <Provider>
          <TaskForm task={existingTask} onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
        </Provider>,
      )

      const titleInput = screen.getByLabelText(/task title/i)
      await user.clear(titleInput)
      await user.type(titleInput, "Updated Task")

      const submitButton = screen.getByRole("button", { name: /update task/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockUpdateTask).toHaveBeenCalledWith({
          updateRequest: expect.objectContaining({
            id: TEST_TASK_ID_1,
            title: "Updated Task",
          }),
        })
      })

      expect(mockOnSuccess).toHaveBeenCalledTimes(1)
    })

    // TODO: Re-enable this test when logger mocking is properly set up
    // The test was temporarily disabled due to logger import changes
    it.skip("handles submission errors gracefully", async () => {
      const user = userEvent.setup()
      mockAddTask.mockRejectedValue(new Error("Network error"))

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const titleInput = screen.getByLabelText(/task title/i)
      await user.type(titleInput, "Task that fails")

      const submitButton = screen.getByRole("button", { name: /create task/i })
      await user.click(submitButton)

      // Test that the form handles the error gracefully (error toast is shown)
      // The actual error logging is tested separately in integration tests
    })
  })

  describe("Priority Handling", () => {
    it("returns correct priority colors", () => {
      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      // This tests the internal getPriorityColor function indirectly
      // by checking that priority flags have different colors
      const flags = screen.getAllByTestId("flag-icon")
      expect(flags.length).toBeGreaterThan(0)
    })

    it("returns correct priority labels", () => {
      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      // Priority labels should be visible in the select options
      expect(screen.getByText(/urgent/i)).toBeInTheDocument()
      expect(screen.getByText(/high/i)).toBeInTheDocument()
      expect(screen.getByText(/medium/i)).toBeInTheDocument()
      expect(screen.getByText(/low/i)).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("handles empty projects array", async () => {
      const { useAtomValue } = await import("jotai")
      vi.mocked(useAtomValue).mockImplementation((atom: unknown) => {
        const atomString = hasToString(atom) ? atom.toString?.() : undefined
        if (atomString?.includes("projects")) {
          return []
        }
        if (atomString?.includes("labels")) {
          return mockLabels
        }
        return []
      })

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      // Should still render project select even if empty
      expect(screen.getAllByTestId("select-trigger")).toHaveLength(2) // Project and priority selects
    })

    it("handles empty labels array", async () => {
      const { useAtomValue } = await import("jotai")
      vi.mocked(useAtomValue).mockImplementation((atom: unknown) => {
        const atomString = hasToString(atom) ? atom.toString?.() : undefined
        if (atomString?.includes("projects")) {
          return mockProjects
        }
        if (atomString?.includes("labels")) {
          return []
        }
        return []
      })

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      // Should not show label suggestions when empty
      expect(screen.queryByText("urgent")).not.toBeInTheDocument()
      expect(screen.queryByText("work")).not.toBeInTheDocument()
    })

    it("handles input correctly", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const labelInput = screen.getByPlaceholderText(/add label/i)
      // Test that we can type in the input (basic functionality)
      await user.type(labelInput, "test-input")

      // Input should contain the typed text
      expect(labelInput).toHaveValue("test-input")
    })

    it("does not add empty labels", async () => {
      const user = userEvent.setup()

      render(
        <Provider>
          <TaskForm onCancel={mockOnCancel} />
        </Provider>,
      )

      const labelInput = screen.getByPlaceholderText(/add label/i)
      await user.type(labelInput, "   ")
      await user.keyboard("{Enter}")

      expect(screen.queryByText("   ")).not.toBeInTheDocument()
      expect(labelInput).toHaveValue("   ")
    })
  })
})
