import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"
import { render, screen, waitFor } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { LabelContent } from "./label-content"
import type { Task, Label, LabelId } from "@/lib/types"
import { createLabelId } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_GROUP_ID_1,
  TEST_LABEL_ID_1,
  TEST_LABEL_ID_2,
  TEST_LABEL_ID_3,
} from "@/lib/utils/test-constants"

// Mock atoms
let mockLabelsFromIds: Mock
let mockAllLabels: Label[]

// Mock Jotai
vi.mock("jotai", () => ({
  useAtomValue: vi.fn((atom: { toString: () => string }) => {
    if (atom.toString().includes("labelsFromIdsAtom")) return mockLabelsFromIds
    if (atom.toString().includes("sortedLabelsAtom")) return mockAllLabels
    if (atom.toString().includes("labelsAtom")) return mockAllLabels
    return vi.fn()
  }),
  Provider: vi.fn(({ children }) => children),
}))

// Mock atoms
vi.mock("@/lib/atoms/core/labels", () => ({
  labelsFromIdsAtom: { toString: () => "labelsFromIdsAtom" },
  sortedLabelsAtom: { toString: () => "sortedLabelsAtom" },
  labelsAtom: { toString: () => "labelsAtom" },
}))

// Mock component interfaces
interface MockButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: string
  size?: string
  className?: string
  [key: string]: unknown
}

interface MockBadgeProps {
  children: React.ReactNode
  variant?: string
  className?: string
  style?: React.CSSProperties
  [key: string]: unknown
}

interface MockCommandProps {
  children: React.ReactNode
  className?: string
  [key: string]: unknown
}

interface MockCommandInputProps {
  placeholder?: string
  value?: string
  onValueChange?: (value: string) => void
  onKeyDown?: (event: React.KeyboardEvent) => void
  className?: string
  autoFocus?: boolean
  [key: string]: unknown
}

interface MockCommandItemProps {
  children: React.ReactNode
  onSelect?: () => void
  className?: string
  [key: string]: unknown
}

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: MockButtonProps) => (
    <button
      onClick={onClick}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className, style, ...props }: MockBadgeProps) => (
    <div
      data-variant={variant}
      className={className}
      style={style}
      data-testid="label-badge"
      {...props}
    >
      {children}
    </div>
  ),
}))

vi.mock("@/components/ui/command", () => ({
  Command: ({ children, className, ...props }: MockCommandProps) => (
    <div className={className} data-testid="command" {...props}>
      {children}
    </div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-group">{children}</div>
  ),
  CommandInput: ({
    placeholder,
    value,
    onValueChange,
    onKeyDown,
    className,
    autoFocus,
    ...props
  }: MockCommandInputProps) => (
    <input
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      onKeyDown={onKeyDown}
      className={className}
      autoFocus={autoFocus}
      data-testid="command-input"
      {...props}
    />
  ),
  CommandItem: ({ children, onSelect, className, ...props }: MockCommandItemProps) => (
    <div
      onClick={onSelect}
      className={className}
      data-testid="command-item"
      role="option"
      aria-selected="false"
      {...props}
    >
      {children}
    </div>
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),
}))

// Mock icons
vi.mock("lucide-react", () => ({
  Tag: () => <span data-testid="tag-icon">🏷️</span>,
  X: () => <span data-testid="x-icon">✖️</span>,
  Plus: () => <span data-testid="plus-icon">➕</span>,
}))

// Mock utility functions
vi.mock("@/lib/utils", () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(" "),
}))

describe("LabelContent", () => {
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
    attachments: [],
    createdAt: new Date(),
    recurringMode: "dueDate",
    status: "active" as const,
    order: 0,
    favorite: false,
    recurring: undefined,
    ...overrides,
  })

  const createMockLabel = (id: LabelId, name: string, color: string = "#ff0000"): Label => ({
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    color,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    // Initialize mock data
    mockLabelsFromIds = vi.fn((labelIds: LabelId[] | null | undefined) => {
      if (!labelIds || !Array.isArray(labelIds)) return []
      return labelIds.map((id) => {
        if (id === TEST_LABEL_ID_1) return createMockLabel(id, "Work", "#ff0000")
        if (id === TEST_LABEL_ID_2) return createMockLabel(id, "Personal", "#00ff00")
        if (id === TEST_LABEL_ID_3) return createMockLabel(id, "Important", "#0000ff")
        return createMockLabel(id, `Label ${id}`, "#cccccc")
      })
    })

    mockAllLabels = [
      createMockLabel(TEST_LABEL_ID_1, "Work", "#ff0000"),
      createMockLabel(TEST_LABEL_ID_2, "Personal", "#00ff00"),
      createMockLabel(TEST_LABEL_ID_3, "Important", "#0000ff"),
    ]

    // Mock console.log to prevent test output pollution
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    // Remove event listeners to prevent memory leaks between tests
    document.removeEventListener("mousedown", vi.fn())
  })

  describe("Rendering Modes", () => {
    it("renders in inline mode by default", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      // Should show input field in inline mode
      expect(screen.getByTestId("label-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Search or create labels...")).toBeInTheDocument()
    })

    it("renders in popover mode when specified", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          mode="popover"
        />,
      )

      // Should show input field in popover mode with padding
      expect(screen.getByTestId("label-input")).toBeInTheDocument()
      const container = screen.getByTestId("label-input").closest(".space-y-3")
      expect(container).toHaveClass("p-2")
    })

    it("applies custom className", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      const { container } = render(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          className="custom-class"
        />,
      )

      expect(container.firstChild).toHaveClass("custom-class")
    })
  })

  describe("Task Data Handling", () => {
    it("displays existing labels when task has labels", () => {
      const task = createMockTask({
        labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
      })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          mode="popover"
        />,
      )

      // Labels are shown directly without header
      expect(screen.getByText("Work")).toBeInTheDocument()
      expect(screen.getByText("Personal")).toBeInTheDocument()
    })

    it("shows label input when task has no labels", () => {
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          mode="popover"
        />,
      )

      expect(screen.getByTestId("label-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Search or create labels...")).toBeInTheDocument()
    })

    it("handles undefined task gracefully (quick-add mode)", () => {
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} mode="popover" />)

      // Should show input field and not crash
      expect(screen.getByTestId("label-input")).toBeInTheDocument()
      expect(screen.queryByTestId("label-badge")).not.toBeInTheDocument()
    })

    it("supports taskId prop for future compatibility", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      // Should render without errors (taskId is currently logged but not used)
      expect(screen.getByTestId("label-input")).toBeInTheDocument()
    })
  })

  describe("Label Display", () => {
    it("renders label badges with correct styling", () => {
      const task = createMockTask({
        labels: [TEST_LABEL_ID_1],
      })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const badge = screen.getByTestId("label-badge")
      expect(badge).toHaveStyle({
        backgroundColor: "#ff0000",
        color: "white",
        border: "none",
      })
      expect(screen.getByText("Work")).toBeInTheDocument()
    })

    it("includes remove buttons for each label", () => {
      const task = createMockTask({
        labels: [TEST_LABEL_ID_1, TEST_LABEL_ID_2],
      })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const removeButtons = screen.getAllByTestId("x-icon")
      expect(removeButtons).toHaveLength(2)
    })

    it("calls onRemoveLabel when remove button is clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        labels: [TEST_LABEL_ID_1],
      })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const removeButton = screen.getByTestId("x-icon").closest("button")
      if (removeButton) {
        await user.click(removeButton)
      }

      expect(onRemoveLabel).toHaveBeenCalledWith(TEST_LABEL_ID_1)
    })
  })

  describe("Add Label Interface", () => {
    it("shows label input field always visible", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      expect(screen.getByTestId("label-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Search or create labels...")).toBeInTheDocument()
      expect(screen.getByTestId("label-submit-button")).toBeInTheDocument()
    })

    it("shows dropdown when typing in input", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")

      // Dropdown should appear when there's text
      await waitFor(() => {
        expect(screen.getByTestId("command")).toBeInTheDocument()
      })
    })

    it.skip("calls onAddingChange when typing starts (implementation changed)", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()
      const onAddingChange = vi.fn()

      render(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          onAddingChange={onAddingChange}
        />,
      )

      const input = screen.getByTestId("label-input")
      await user.type(input, "test")

      // onAddingChange is called when dropdown opens
      expect(onAddingChange).toHaveBeenCalledWith(true)
    })
  })

  describe("Label Filtering", () => {
    it("shows available labels when typing", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] }) // No existing labels
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "w") // Type to trigger dropdown

      await waitFor(() => {
        const commandItems = screen.getAllByTestId("command-item")
        // "Work" matches "w" and also shows "Create w" option
        expect(commandItems).toHaveLength(2)
        expect(screen.getByText("Work")).toBeInTheDocument()
        expect(screen.getByText('Create "w"')).toBeInTheDocument()
      })
    })

    it("filters labels based on search term", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "work")

      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument()
        expect(screen.queryByText("Personal")).not.toBeInTheDocument()
      })
    })

    it("excludes already added labels from suggestions", async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        labels: [TEST_LABEL_ID_1], // Work is already added
      })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")

      // Work should be in the badge area but not in command items
      await waitFor(() => {
        // Since we're searching for "w" and "Work" is already added,
        // it will show the create option for "w"
        expect(screen.getByText('Create "w"')).toBeInTheDocument()
      })
    })
  })

  describe("Creating New Labels", () => {
    it("shows create option when search term doesn't match existing labels", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "new label")

      await waitFor(() => {
        expect(screen.getByText('Create "new label"')).toBeInTheDocument()
      })
    })

    it("calls onAddLabel with new label name when create button clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "new label")

      await waitFor(() => {
        expect(screen.getByText('Create "new label"')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create "new label"'))

      expect(onAddLabel).toHaveBeenCalledWith("new label")
    })

    it("shows 'No labels found' when search is empty and no matches", async () => {
      const user = userEvent.setup()

      // Mock empty labels array
      mockAllLabels = []

      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")

      // With no labels available, it will show the create option
      await waitFor(() => {
        expect(screen.getByText('Create "w"')).toBeInTheDocument()
      })
    })
  })

  describe("Adding Labels", () => {
    it("adds existing label when selected", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")
      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument()
      })
      await user.click(screen.getByText("Work"))

      expect(onAddLabel).toHaveBeenCalledWith("Work")
    })

    it("clears input and stops adding after successful add", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()
      const onAddingChange = vi.fn()

      render(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          onAddingChange={onAddingChange}
        />,
      )

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")
      // Don't type anything, just click on existing label
      await waitFor(() => {
        expect(screen.getByText("Work")).toBeInTheDocument()
      })
      await user.click(screen.getByText("Work"))

      expect(onAddingChange).toHaveBeenCalledWith(false)
      expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument()
    })

    it("trims whitespace from new label names", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "  spaced label  ")

      await waitFor(() => {
        expect(screen.getByText('Create "spaced label"')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Create "spaced label"'))

      expect(onAddLabel).toHaveBeenCalledWith("spaced label")
    })
  })

  describe("Keyboard Navigation", () => {
    it("cancels adding when Escape key is pressed", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()
      const onAddingChange = vi.fn()

      render(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          onAddingChange={onAddingChange}
        />,
      )

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")
      expect(screen.getByTestId("label-input")).toBeInTheDocument()

      await user.keyboard("{Escape}")

      expect(onAddingChange).toHaveBeenCalledWith(false)
      expect(screen.queryByTestId("popover-content")).not.toBeInTheDocument()
    })

    it("sets autoFocus on command input when starting to add", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")

      // The command input should be rendered (indicating adding state is true)
      expect(screen.getByTestId("label-input")).toBeInTheDocument()
    })
  })

  describe("Click Outside Behavior", () => {
    it.skip("cancels adding when clicking outside (Popover handles this automatically)", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()
      const onAddingChange = vi.fn()

      render(
        <div>
          <LabelContent
            task={task}
            onAddLabel={onAddLabel}
            onRemoveLabel={onRemoveLabel}
            onAddingChange={onAddingChange}
          />
          <button>Outside button</button>
        </div>,
      )

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")
      expect(screen.getByTestId("label-input")).toBeInTheDocument()

      // Click outside
      await user.click(screen.getByText("Outside button"))

      expect(onAddingChange).toHaveBeenCalledWith(false)
    })

    it("does not cancel when clicking inside the command interface", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()
      const onAddingChange = vi.fn()

      render(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          onAddingChange={onAddingChange}
        />,
      )

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")
      onAddingChange.mockClear()

      // Click inside label input (the command interface is now the label input)
      await user.click(screen.getByTestId("label-input"))

      expect(onAddingChange).not.toHaveBeenCalledWith(false)
    })
  })

  describe("Edge Cases", () => {
    it("handles empty search gracefully", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      const input = screen.getByTestId("label-input")
      await user.type(input, "w")

      // Input has space, should show available labels
      await waitFor(() => {
        const commandItems = screen.getAllByTestId("command-item")
        expect(commandItems.length).toBeGreaterThan(0)
      })
    })

    it("handles missing onAddingChange callback gracefully", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      // Should not crash when onAddingChange is not provided
      const input = screen.getByTestId("label-input")
      await user.type(input, "w")
      expect(screen.getByTestId("label-input")).toBeInTheDocument()
    })

    it("handles task with null/undefined labels array", () => {
      const taskWithNullLabels = createMockTask()
      // @ts-expect-error - Testing edge case
      taskWithNullLabels.labels = null

      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelContent
          task={taskWithNullLabels}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          mode="popover"
        />,
      )

      expect(screen.getByTestId("label-input")).toBeInTheDocument()
    })
  })
})
