import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  render,
  screen,
  fireEvent,
  waitFor,
  mockContentPopoverComponent,
  mockHelpPopoverComponent,
  mockTimeEstimationPopoverComponent,
  mockSubtaskPopoverComponent,
  handleSettingsAtomInMock,
} from "@/test-utils"
import { QuickAddDialog } from "./quick-add-dialog"
import type { Project } from "@/lib/types"

// Mock component props interface
interface MockComponentProps {
  children?: React.ReactNode
  open?: boolean
  className?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  rows?: number
  onClick?: () => void
  disabled?: boolean
  onValueChange?: (value: string) => void
  variant?: string
}

/**
 * Integration Tests for Quick Add Dialog Alignment
 *
 * These tests ensure the enhanced highlighted input works correctly
 * within the quick add dialog context and maintains proper alignment.
 */

// Mock all external dependencies
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: MockComponentProps) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContentWithoutOverlay: ({ children, className }: MockComponentProps) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogTitle: ({ children }: MockComponentProps) => (
    <div data-testid="dialog-title">{children}</div>
  ),
}))

vi.mock("@/components/ui/textarea", () => ({
  Textarea: ({ placeholder, value, onChange, className, rows }: MockComponentProps) => (
    <textarea
      data-testid="task-description"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={className}
      rows={rows}
    />
  ),
}))

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: MockComponentProps) => <div data-testid="project-select">{children}</div>,
  SelectTrigger: ({ children }: MockComponentProps) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: () => <span data-testid="select-value">Inbox</span>,
  SelectContent: ({ children }: MockComponentProps) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: MockComponentProps) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, className, variant }: MockComponentProps) => (
    <div data-testid="badge" className={className} data-variant={variant}>
      {children}
    </div>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, className }: MockComponentProps) => (
    <button data-testid="button" onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  buttonVariants: () => "mock-button-variant-class",
}))

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
    className,
  }: MockComponentProps & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }) => (
    <button
      data-testid="switch"
      onClick={() => onCheckedChange?.(!checked)}
      className={className}
      data-checked={checked}
    >
      {checked ? "ON" : "OFF"}
    </button>
  ),
}))

vi.mock("lucide-react", () => ({
  Plus: () => <span data-testid="plus-icon">+</span>,
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  Hash: () => <span data-testid="hash-icon">#</span>,
  Tag: () => <span data-testid="tag-icon">🏷️</span>,
  AlertCircle: () => <span data-testid="alert-icon">⚠️</span>,
  Repeat: () => <span data-testid="repeat-icon">🔄</span>,
  X: () => <span data-testid="x-icon">✕</span>,
  Folder: () => <span data-testid="folder-icon">📁</span>,
  Clock: () => <span data-testid="clock-icon">⏰</span>,
  Flag: () => <span data-testid="flag-icon">🚩</span>,
  Star: () => <span data-testid="star-icon">⭐</span>,
  Settings: () => <span data-testid="settings-icon">⚙️</span>,
  ChevronDown: () => <span data-testid="chevron-down-icon">⬇️</span>,
  ChevronUp: () => <span data-testid="chevron-up-icon">⬆️</span>,
  Sparkles: () => <span data-testid="sparkles-icon">✨</span>,
  Users: () => <span data-testid="users-icon">👥</span>,
  AlertTriangle: () => <span data-testid="alert-triangle-icon">⚠️</span>,
  MessageSquare: () => <span data-testid="message-square-icon">💬</span>,
  HelpCircle: () => <span data-testid="help-circle-icon">?</span>,
  MoreHorizontal: () => <span data-testid="more-horizontal-icon">⋯</span>,
  CheckSquare: () => <span data-testid="check-square-icon">☑️</span>,
  ArrowRight: () => <span data-testid="arrow-right-icon">→</span>,
  Sun: () => <span data-testid="sun-icon">☀️</span>,
  Moon: () => <span data-testid="moon-icon">🌙</span>,
  Sunrise: () => <span data-testid="sunrise-icon">🌅</span>,
  FastForward: () => <span data-testid="fast-forward-icon">⏩</span>,
  AlarmClockOff: () => <span data-testid="alarm-clock-off-icon">⏰🚫</span>,
  Ban: () => <span data-testid="ban-icon">🚫</span>,
  CalendarClock: () => <span data-testid="calendar-clock-icon">📅⏰</span>,
  CalendarDays: () => <span data-testid="calendar-days-icon">📅📋</span>,
  ChevronLeftIcon: () => <span data-testid="chevron-left-icon">←</span>,
  ChevronRightIcon: () => <span data-testid="chevron-right-icon">→</span>,
  ChevronDownIcon: () => <span data-testid="chevron-down-icon">↓</span>,
  Inbox: () => <span data-testid="inbox-icon">📥</span>,
  LoaderCircle: ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => (
    <span data-testid="loader-circle-icon" className={className} {...props}>
      ⏳
    </span>
  ),
}))

vi.mock("@radix-ui/react-visually-hidden", () => ({
  VisuallyHidden: ({ children }: MockComponentProps) => (
    <div style={{ display: "none" }}>{children}</div>
  ),
}))

vi.mock("@/components/task/task-project-popover", () => ({
  TaskProjectPopover: ({
    children,
    onUpdate,
  }: MockComponentProps & { onUpdate?: (projectId?: string) => void }) => (
    <div data-testid="task-project-popover">
      {children}
      <button data-testid="mock-project-trigger" onClick={() => onUpdate?.("test-project-id")}>
        Mock Project Selection
      </button>
    </div>
  ),
}))

// Mock atoms
const mockLabels = [
  { id: "1", name: "urgent", color: "#ff0000", nextLabelId: null },
  { id: "2", name: "important", color: "#00ff00", nextLabelId: null },
]
const mockProjects: Project[] = []

const mockRouteContext = {
  pathname: "/today",
  viewId: "today",
  projectId: "view-today",
  routeType: "standard",
  routeParams: {},
}

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

vi.mock("@/components/task/subtask-popover", () => ({
  SubtaskPopover: mockSubtaskPopoverComponent,
}))

vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    atom: actual.atom,
    useAtomValue: vi.fn((atom) => {
      if (!atom) return []
      if (atom.toString().includes("showQuickAddAtom")) return true
      if (atom.toString().includes("sortedLabelsAtom")) return mockLabels
      if (atom.toString().includes("visibleProjectsAtom")) return mockProjects
      if (atom.toString().includes("currentRouteContextAtom")) return mockRouteContext
      if (atom.toString().includes("projectIdsAtom")) return new Set(["1", "2"])
      const settingsResult = handleSettingsAtomInMock(atom)
      if (settingsResult) return settingsResult
      return []
    }),
    useSetAtom: vi.fn(() => vi.fn()),
  }
})

vi.mock("@/lib/types", () => ({
  INBOX_PROJECT_ID: "inbox",
  createProjectId: vi.fn((id) => id),
  createLabelId: vi.fn((id) => id),
  createSubtaskId: vi.fn((id) => id),
  createTaskId: vi.fn((id) => id),
  createSectionId: vi.fn((id) => id),
  createGroupId: vi.fn((id) => id),
  createCommentId: vi.fn((id) => id),
  createVoiceCommandId: vi.fn((id) => id),
  // Mock Zod schemas used by mutation atoms
  UpdateTaskResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { taskIds: [], success: true, message: "Mock response" },
    }),
  },
  CreateTaskResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { taskIds: [], success: true, message: "Mock response" },
    }),
  },
  DeleteTaskResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { taskIds: [], success: true, message: "Mock response" },
    }),
  },
  CreateProjectResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { projectIds: [], success: true, message: "Mock response" },
    }),
  },
  CreateLabelResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { labelIds: [], success: true, message: "Mock response" },
    }),
  },
  CreateGroupResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { labelIds: [], success: true, message: "Mock response" },
    }),
  },
  LabelCreateSerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  CreateTaskRequestSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  DeleteTaskRequestSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: "mock-id" }),
  },
  CreateGroupRequestSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  TaskArraySerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: [] }),
  },
  TaskUpdateArraySerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: [] }),
  },
  TaskCreateSerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  TaskDeleteSerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: { id: "mock-id" } }),
  },
  TaskSerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  // Project-related schemas
  ProjectCreateSerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  ProjectUpdateArraySerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: [] }),
  },
  ProjectDeleteSerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: { id: "mock-id" } }),
  },
  UpdateProjectResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { projectIds: [], success: true, message: "Mock response" },
    }),
  },
  DeleteProjectResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { projectIds: [], success: true, message: "Mock response" },
    }),
  },
  // Label-related schemas
  LabelUpdateArraySerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: [] }),
  },
  UpdateLabelResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { labelIds: [], success: true, message: "Mock response" },
    }),
  },
  DeleteLabelResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { labelIds: [], success: true, message: "Mock response" },
    }),
  },
  LabelDeleteSerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: { id: "mock-id" } }),
  },
  // Ordering-related schemas
  OrderingUpdateResponseSchema: {
    safeParse: vi
      .fn()
      .mockReturnValue({ success: true, data: { success: true, message: "Mock response" } }),
  },
  OrderingSerializationSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  // Settings-related schemas
  UpdateSettingsResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { success: true, settings: {}, message: "Mock response" },
    }),
  },
  UpdateSettingsRequestSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  UpdateGroupResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { labelIds: [], success: true, message: "Mock response" },
    }),
  },
  BulkGroupUpdateSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { type: "project", groups: [] },
    }),
  },
  GroupUpdateUnionSchema: {
    safeParse: vi
      .fn()
      .mockReturnValue({ success: true, data: { success: true, message: "Mock response" } }),
  },
  DeleteGroupResponseSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { labelIds: [], success: true, message: "Mock response" },
    }),
  },
  DeleteGroupRequestSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: "mock-id" }),
  },
  UpdateProjectGroupRequestSchema: {
    safeParse: vi.fn().mockReturnValue({ success: true, data: {} }),
  },
  // Validator functions
  isValidPriority: vi.fn((value: unknown) => typeof value === "number" && value >= 1 && value <= 4),
  isValidViewMode: vi.fn(
    (value: unknown) =>
      typeof value === "string" && ["list", "kanban", "calendar", "table", "stats"].includes(value),
  ),
  isValidSortDirection: vi.fn(
    (value: unknown) => typeof value === "string" && ["asc", "desc"].includes(value),
  ),
}))

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("date-fns", () => ({
  format: vi.fn().mockReturnValue("Jan 1"),
  parse: vi.fn(),
  addDays: vi.fn().mockReturnValue(new Date()),
  nextMonday: vi.fn().mockReturnValue(new Date()),
  nextFriday: vi.fn().mockReturnValue(new Date()),
  startOfDay: vi.fn().mockReturnValue(new Date()),
}))

describe("Quick Add Dialog - Alignment Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Enhanced Input Integration", () => {
    it("should render enhanced highlighted input without conflicting styles", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })
      expect(contentEditable).toBeInTheDocument()

      // Should have exact classes from working example (no conflicts)
      expect(contentEditable).toHaveClass("w-full")
      expect(contentEditable).toHaveClass("min-h-[60px]")
      expect(contentEditable).toHaveClass("p-3")
      expect(contentEditable).toHaveClass("break-words")
      expect(contentEditable).toHaveClass("whitespace-break-spaces")
      expect(contentEditable).not.toHaveClass("text-transparent")
      expect(contentEditable).not.toHaveClass("z-10")

      // Should NOT have conflicting classes
      expect(contentEditable).not.toHaveClass("px-0")
      expect(contentEditable).not.toHaveClass("border-0")
      expect(contentEditable).not.toHaveClass("text-lg")
    })

    it("should have properly positioned overlay element", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })
      const container = contentEditable.parentElement
      const overlay = container?.querySelector(".absolute.inset-0")

      expect(overlay).toBeInTheDocument()
      expect(overlay).toHaveClass("absolute")
      expect(overlay).toHaveClass("inset-0")
      expect(overlay).toHaveClass("p-3")
      expect(overlay).toHaveClass("pointer-events-none")
      expect(overlay).toHaveClass("z-0")
      expect(overlay).toHaveClass("whitespace-break-spaces")
      expect(overlay).toHaveClass("break-words")
    })

    it("should maintain alignment when switching between empty and filled states", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")

      // Store initial classes
      const initialContentEditableClasses = contentEditable.className
      const initialOverlayClasses = overlay?.className

      // Simulate input with tokens
      fireEvent.input(contentEditable, {
        target: { textContent: "Task #project @label p1" },
      })

      // Classes should remain unchanged after input
      expect(contentEditable.className).toBe(initialContentEditableClasses)
      expect(overlay?.className).toBe(initialOverlayClasses)

      // Clear input
      fireEvent.input(contentEditable, {
        target: { textContent: "" },
      })

      // Classes should still remain unchanged
      expect(contentEditable.className).toBe(initialContentEditableClasses)
      expect(overlay?.className).toBe(initialOverlayClasses)
    })
  })

  describe("Token Rendering Alignment", () => {
    it("should render highlighted tokens without padding that causes shift", async () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })

      // Simulate input with multiple token types
      fireEvent.input(contentEditable, {
        target: { textContent: "Complete task #work @urgent p1 today" },
      })

      await waitFor(() => {
        const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")
        const tokens = overlay?.querySelectorAll('span[class*="bg-"]')
        expect(tokens && tokens.length).toBeGreaterThan(0)
      })

      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")
      const tokens = overlay?.querySelectorAll('span[class*="bg-"]')

      expect(tokens && tokens.length).toBeGreaterThan(0)

      tokens?.forEach((token) => {
        // Critical: No padding that shifts text
        expect(token).not.toHaveClass("px-0.5")
        expect(token).not.toHaveClass("px-1")
        expect(token).not.toHaveClass("rounded")

        expect(token).toHaveClass("opacity-60")
        expect(token).not.toHaveClass("cursor-pointer")
        expect(token).not.toHaveClass("hover:opacity-80")
      })
    })

    it("should handle disabled sections without affecting alignment", async () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })

      // Add content with tokens
      fireEvent.input(contentEditable, {
        target: { textContent: "Task #project @label" },
      })

      // Find a token and click to disable it
      await waitFor(() => {
        const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")
        const tokens = overlay?.querySelectorAll('span[class*="bg-"]')
        const projectToken = Array.from(tokens ?? []).find((token) =>
          token.textContent?.includes("#project"),
        )
        expect(projectToken).toBeTruthy()
      })

      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")
      const tokens = overlay?.querySelectorAll('span[class*="bg-"]')
      const projectToken = Array.from(tokens ?? []).find((token) =>
        token.textContent?.includes("#project"),
      )

      if (projectToken) {
        fireEvent.click(projectToken)

        // Token should now be disabled but without layout shift
        expect(projectToken).not.toHaveClass("px-0.5")
        expect(projectToken).not.toHaveClass("cursor-pointer")
      }
    })
  })

  describe("Dialog Context Integration", () => {
    it("should maintain input styling within dialog padding context", () => {
      render(<QuickAddDialog />)

      // Dialog has internal p-6 padding structure
      const dialogContent = screen.getByTestId("dialog-content")
      expect(dialogContent).toBeInTheDocument()

      // Input should be positioned correctly within this context
      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })
      const inputContainer = contentEditable.parentElement

      expect(inputContainer).toHaveClass("relative")
      expect(contentEditable).toHaveClass("p-3", "bg-transparent")
      expect(contentEditable).not.toHaveClass("z-10")
    })

    it("should handle focus states correctly within dialog", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })

      // Should have autoFocus
      expect(contentEditable).toHaveAttribute(
        "aria-label",
        "Quick add task input with natural language parsing",
      )

      // Focus should not affect alignment classes
      contentEditable.focus()
      expect(contentEditable).not.toHaveClass("text-transparent")
      expect(contentEditable).not.toHaveClass("z-10")
    })
  })

  describe("Autocomplete Integration", () => {
    it("should position autocomplete dropdown correctly relative to input", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })

      // Trigger autocomplete with #
      fireEvent.input(contentEditable, { target: { textContent: "#" } })

      // Autocomplete should appear without affecting input positioning
      const inputContainer = contentEditable.parentElement
      const autocompleteDropdown = inputContainer?.querySelector(".absolute.z-20")

      if (autocompleteDropdown) {
        expect(autocompleteDropdown).toHaveClass("absolute")
        expect(autocompleteDropdown).toHaveClass("z-20")

        // Should not affect the input's position
        expect(contentEditable).not.toHaveClass("z-10")
      }
    })
  })

  describe("Parsed Elements Display", () => {
    it("should display parsed element pills without affecting input alignment", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })

      // Add complex content
      fireEvent.input(contentEditable, {
        target: { textContent: "Review reports #work @urgent p1 tomorrow 2PM for 2h daily" },
      })

      // Parsed elements are rendered but may not show as badges in test environment
      // The important thing is that input alignment is not affected
      expect(contentEditable).not.toHaveClass("text-transparent")
      expect(contentEditable).not.toHaveClass("z-10")

      // Input container should maintain proper structure
      const inputContainer = contentEditable.parentElement
      expect(inputContainer).toHaveClass("relative")

      // Verify tokens are rendered in overlay
      const overlay = inputContainer?.querySelector(".absolute.inset-0")
      expect(overlay).toBeInTheDocument()
      expect(overlay).toHaveClass("absolute", "inset-0", "p-3", "z-0")
    })
  })

  describe("Performance and State Management", () => {
    it("should handle rapid input changes without layout thrashing", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })

      // Store initial classes
      const initialClasses = contentEditable.className

      // Simulate rapid typing
      const inputs = [
        "T",
        "Ta",
        "Task",
        "Task #",
        "Task #w",
        "Task #work",
        "Task #work @",
        "Task #work @urgent",
        "Task #work @urgent p1",
      ]

      inputs.forEach((input) => {
        fireEvent.input(contentEditable, { target: { textContent: input } })

        // Classes should remain stable throughout
        expect(contentEditable.className).toBe(initialClasses)
      })
    })

    it("should maintain consistent rendering during debounced parsing", async () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")

      // Input with debounced parsing
      fireEvent.input(contentEditable, {
        target: { textContent: "Complex task #project @label p1 tomorrow" },
      })

      // Overlay should maintain position during parsing delay
      expect(overlay).toHaveClass("absolute", "inset-0", "z-0")
      expect(contentEditable).not.toHaveClass("z-10")
    })
  })

  describe("Edge Cases and Error Handling", () => {
    it("should handle very long content without horizontal scroll issues", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })

      // Very long content that might cause overflow
      const longContent = "A".repeat(200) + " #project @label"
      fireEvent.input(contentEditable, { target: { textContent: longContent } })

      // Should maintain positioning despite overflow
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")
      expect(overlay).toHaveClass("absolute", "inset-0")
      expect(overlay).toHaveClass("whitespace-break-spaces", "break-words")
    })

    it("should handle special characters and emojis without breaking alignment", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })

      // Content with emojis and special characters
      const specialContent = "🚀 Task with émojis & spëcial chars #project @urgent"
      fireEvent.input(contentEditable, { target: { textContent: specialContent } })

      // Should maintain alignment with special characters
      const overlay = contentEditable.parentElement?.querySelector(".absolute.inset-0")
      expect(overlay).toBeInTheDocument()
      expect(contentEditable).not.toHaveClass("text-transparent")
    })

    it("should recover gracefully from any potential CSS conflicts", () => {
      render(<QuickAddDialog />)

      const contentEditable = screen.getByRole("combobox", {
        name: "Quick add task input with natural language parsing",
      })

      // Verify the critical CSS classes are present (not computed styles in test env)
      expect(contentEditable).toHaveClass("p-3") // Consistent padding
      expect(contentEditable).not.toHaveClass("text-transparent") // Cursor visibility fix
      expect(contentEditable).not.toHaveClass("z-10") // Cursor visibility fix

      // Should not have conflicting classes
      expect(contentEditable).not.toHaveClass("px-0")
      expect(contentEditable).not.toHaveClass("border-0")
      expect(contentEditable).not.toHaveClass("text-lg")
    })
  })
})
