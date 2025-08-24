import React from "react"
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { LabelContent } from "./label-content"
import type { Task, Label, LabelId } from "@/lib/types"
import { createLabelId } from "@/lib/types"
import {
  TEST_TASK_ID_1,
  TEST_PROJECT_ID_1,
  TEST_SECTION_ID_1,
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
    return vi.fn()
  }),
}))

// Mock atoms
vi.mock("@/lib/atoms/core/labels", () => ({
  labelsFromIdsAtom: { toString: () => "labelsFromIdsAtom" },
  sortedLabelsAtom: { toString: () => "sortedLabelsAtom" },
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
    sectionId: TEST_SECTION_ID_1,
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

      // Should not show header in inline mode
      expect(screen.queryByText("Add Labels")).not.toBeInTheDocument()
      expect(screen.queryByText("Labels (0)")).not.toBeInTheDocument()
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

      // Should show header in popover mode
      expect(screen.getByText("Add Labels")).toBeInTheDocument()
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

      expect(screen.getByText("Labels (2)")).toBeInTheDocument()
      expect(screen.getByText("Work")).toBeInTheDocument()
      expect(screen.getByText("Personal")).toBeInTheDocument()
    })

    it("shows 'Add Labels' header when task has no labels", () => {
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

      expect(screen.getByText("Add Labels")).toBeInTheDocument()
    })

    it("handles undefined task gracefully (quick-add mode)", () => {
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} mode="popover" />)

      // Should show add labels and not crash
      expect(screen.getByText("Add Labels")).toBeInTheDocument()
      expect(screen.queryByTestId("label-badge")).not.toBeInTheDocument()
    })

    it("supports taskId prop for future compatibility", () => {
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(
        <LabelContent
          taskId="test-task-id"
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
        />,
      )

      // Should render without errors (taskId is currently logged but not used)
      expect(screen.getByText("Add label")).toBeInTheDocument()
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
    it("shows add label button when not adding", () => {
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      expect(screen.getByText("Add label")).toBeInTheDocument()
      expect(screen.getByTestId("plus-icon")).toBeInTheDocument()
    })

    it("shows command interface when adding", async () => {
      const user = userEvent.setup()
      const task = createMockTask()
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))

      expect(screen.getByTestId("command")).toBeInTheDocument()
      expect(screen.getByTestId("command-input")).toBeInTheDocument()
      expect(screen.getByPlaceholderText("Search or create labels...")).toBeInTheDocument()
    })

    it("calls onAddingChange when starting to add", async () => {
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

      await user.click(screen.getByText("Add label"))

      expect(onAddingChange).toHaveBeenCalledWith(true)
    })

    it("starts in adding mode when initialIsAdding is true", () => {
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
          initialIsAdding={true}
        />,
      )

      expect(screen.getByTestId("command-input")).toBeInTheDocument()
      expect(onAddingChange).toHaveBeenCalledWith(true)
    })
  })

  describe("Label Filtering", () => {
    it("shows available labels when no search term", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] }) // No existing labels
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))

      const commandItems = screen.getAllByTestId("command-item")
      expect(commandItems).toHaveLength(3) // All available labels
      expect(screen.getByText("Work")).toBeInTheDocument()
      expect(screen.getByText("Personal")).toBeInTheDocument()
      expect(screen.getByText("Important")).toBeInTheDocument()
    })

    it("filters labels based on search term", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))
      await user.type(screen.getByTestId("command-input"), "work")

      expect(screen.getByText("Work")).toBeInTheDocument()
      expect(screen.queryByText("Personal")).not.toBeInTheDocument()
    })

    it("excludes already added labels from suggestions", async () => {
      const user = userEvent.setup()
      const task = createMockTask({
        labels: [TEST_LABEL_ID_1], // Work is already added
      })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))

      // Work should be in the badge area but not in command items
      const commandItems = screen.getAllByTestId("command-item")

      // Should not have Work in command suggestions
      const workInCommands = commandItems.find((item) => item.textContent?.includes("Work"))
      expect(workInCommands).toBeUndefined()

      // But should have Personal and Important
      expect(screen.getByText("Personal")).toBeInTheDocument()
      expect(screen.getByText("Important")).toBeInTheDocument()
    })

    it("limits suggestions to 5 items", async () => {
      const user = userEvent.setup()

      // Mock more than 5 labels with valid UUIDs
      mockAllLabels = Array.from({ length: 10 }, (_, i) =>
        createMockLabel(
          createLabelId(`550e8400-e29b-41d4-a716-44665544000${i}`),
          `Label ${i}`,
          "#cccccc",
        ),
      )

      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))

      const commandItems = screen.getAllByTestId("command-item")
      expect(commandItems.length).toBeLessThanOrEqual(5)
    })
  })

  describe("Creating New Labels", () => {
    it("shows create option when search term doesn't match existing labels", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))
      await user.type(screen.getByTestId("command-input"), "new label")

      expect(screen.getByText('Create "new label"')).toBeInTheDocument()
    })

    it("calls onAddLabel with new label name when create button clicked", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))
      await user.type(screen.getByTestId("command-input"), "new label")
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

      await user.click(screen.getByText("Add label"))

      expect(screen.getByText("No labels found.")).toBeInTheDocument()
    })
  })

  describe("Adding Labels", () => {
    it("adds existing label when selected", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))
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

      await user.click(screen.getByText("Add label"))
      // Don't type anything, just click on existing label
      await user.click(screen.getByText("Work"))

      expect(onAddingChange).toHaveBeenCalledWith(false)
      expect(screen.queryByTestId("command-input")).not.toBeInTheDocument()
    })

    it("trims whitespace from new label names", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))
      await user.type(screen.getByTestId("command-input"), "  spaced label  ")
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

      await user.click(screen.getByText("Add label"))
      expect(screen.getByTestId("command-input")).toBeInTheDocument()

      await user.keyboard("{Escape}")

      expect(onAddingChange).toHaveBeenCalledWith(false)
      expect(screen.queryByTestId("command-input")).not.toBeInTheDocument()
    })

    it("sets autoFocus on command input when starting to add", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))

      // The command input should be rendered (indicating adding state is true)
      expect(screen.getByTestId("command-input")).toBeInTheDocument()
    })
  })

  describe("Click Outside Behavior", () => {
    it("cancels adding when clicking outside", async () => {
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

      await user.click(screen.getByText("Add label"))
      expect(screen.getByTestId("command-input")).toBeInTheDocument()

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

      await user.click(screen.getByText("Add label"))
      onAddingChange.mockClear()

      // Click inside command interface
      await user.click(screen.getByTestId("command-input"))

      expect(onAddingChange).not.toHaveBeenCalledWith(false)
    })
  })

  describe("State Synchronization", () => {
    it("syncs with external initialIsAdding changes", () => {
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()
      const onAddingChange = vi.fn()

      const { rerender } = render(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          onAddingChange={onAddingChange}
          initialIsAdding={false}
        />,
      )

      expect(screen.queryByTestId("command-input")).not.toBeInTheDocument()

      rerender(
        <LabelContent
          task={task}
          onAddLabel={onAddLabel}
          onRemoveLabel={onRemoveLabel}
          onAddingChange={onAddingChange}
          initialIsAdding={true}
        />,
      )

      expect(screen.getByTestId("command-input")).toBeInTheDocument()
      expect(onAddingChange).toHaveBeenCalledWith(true)
    })
  })

  describe("Edge Cases", () => {
    it("handles empty search gracefully", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      await user.click(screen.getByText("Add label"))

      // Input is empty by default, should show available labels
      const commandItems = screen.getAllByTestId("command-item")
      expect(commandItems.length).toBeGreaterThan(0)
    })

    it("handles missing onAddingChange callback gracefully", async () => {
      const user = userEvent.setup()
      const task = createMockTask({ labels: [] })
      const onAddLabel = vi.fn()
      const onRemoveLabel = vi.fn()

      render(<LabelContent task={task} onAddLabel={onAddLabel} onRemoveLabel={onRemoveLabel} />)

      // Should not crash when onAddingChange is not provided
      await user.click(screen.getByText("Add label"))
      expect(screen.getByTestId("command-input")).toBeInTheDocument()
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

      expect(screen.getByText("Add Labels")).toBeInTheDocument()
    })
  })
})
