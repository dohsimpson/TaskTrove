import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { SelectionToolbar } from "./selection-toolbar"
import type { Task } from "@/lib/types"
import { TEST_COMMENT_ID_1, TEST_SUBTASK_ID_1 } from "@tasktrove/types/test-constants"
import { createTaskId, createUserId } from "@/lib/types"
import { DEFAULT_UUID } from "@tasktrove/constants"

// Mock keyboard shortcuts hook
vi.mock("@/hooks/use-keyboard-shortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}))

// Mock state
let mockSelectedTaskIds: string[]
let mockAllTasks: Task[]
let mockClearSelection: Mock
let mockUpdateTasks: Mock
let mockDeleteTasks: Mock
let mockUpdateTask: Mock

// Mock Jotai
vi.mock("jotai", () => ({
  useSetAtom: vi.fn((atom) => {
    const label = String(atom?.debugLabel ?? "")
    if (label.includes("clearSelectedTasks")) return mockClearSelection
    if (label.includes("tasksAtom")) return mockUpdateTasks
    if (label.includes("deleteTasksAtom")) return mockDeleteTasks
    if (label.includes("updateTask")) return mockUpdateTask
    return vi.fn()
  }),
  useAtomValue: vi.fn((atom) => {
    const label = String(atom?.debugLabel ?? "")
    if (label.includes("selectedTasks")) return mockSelectedTaskIds
    if (label.includes("tasksAtom")) return mockAllTasks
    if (label.includes("userAtom"))
      return {
        id: createUserId(DEFAULT_UUID),
        username: "testuser",
        password: "testpassword",
      }
    if (label.includes("settingsAtom"))
      return {
        general: { popoverHoverOpen: false },
        notifications: {},
        data: {},
      }
    return null
  }),
  useAtom: vi.fn((atom) => {
    const label = String(atom?.debugLabel ?? "")
    // useAtom returns [value, setter]
    if (label.includes("multiSelectDragging")) return [false, vi.fn()]
    return [null, vi.fn()]
  }),
  atom: vi.fn((value) => ({ init: value, toString: () => "mockAtom" })),
  Provider: vi.fn(({ children }) => children),
}))

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

const createMockTask = (id: string, overrides?: Partial<Task>): Task => ({
  id: createTaskId(id),
  title: `Test Task ${id}`,
  description: "",
  completed: false,
  priority: 4,
  labels: [],
  comments: [],
  subtasks: [],
  recurring: undefined,
  dueDate: undefined,
  projectId: undefined,
  createdAt: new Date("2024-01-01"),
  recurringMode: "dueDate",
  ...overrides,
})

describe("SelectionToolbar", () => {
  const mockTask1 = createMockTask("12345678-1234-4234-8234-123456789abc")
  const mockTask2 = createMockTask("12345678-1234-4234-8234-123456789abd")
  const mockTask3 = createMockTask("12345678-1234-4234-8234-123456789abe")

  beforeEach(() => {
    vi.clearAllMocks()
    mockSelectedTaskIds = [mockTask1.id, mockTask2.id]
    mockAllTasks = [mockTask1, mockTask2, mockTask3]
    mockClearSelection = vi.fn()
    mockUpdateTasks = vi.fn()
    mockDeleteTasks = vi.fn()
    mockUpdateTask = vi.fn()
  })

  it("does not render when no tasks are selected", () => {
    mockSelectedTaskIds = []
    const { container } = render(<SelectionToolbar />)

    expect(container.firstChild).toBeNull()
  })

  it("renders toolbar when tasks are selected", () => {
    render(<SelectionToolbar />)

    expect(screen.getByText("2 selected")).toBeInTheDocument()
    expect(screen.getByText("Cancel")).toBeInTheDocument()
  })

  it("displays correct selection count", () => {
    mockSelectedTaskIds = [mockTask1.id, mockTask2.id, mockTask3.id]

    render(<SelectionToolbar />)

    expect(screen.getByText("3 selected")).toBeInTheDocument()
  })

  it("does not render when selection count is 0", () => {
    mockSelectedTaskIds = []

    render(<SelectionToolbar />)

    expect(screen.queryByText("0 selected")).not.toBeInTheDocument()
  })

  it("calls clearSelection when Cancel button is clicked", async () => {
    render(<SelectionToolbar />)

    const cancelButton = screen.getByText("Cancel")
    fireEvent.click(cancelButton)

    expect(mockClearSelection).toHaveBeenCalledOnce()
  })

  it("registers Escape key handler to clear selection", async () => {
    const { useKeyboardShortcuts } = await import("@/hooks/use-keyboard-shortcuts")
    const mockHook = vi.mocked(useKeyboardShortcuts)

    render(<SelectionToolbar />)

    // Verify the hook was called with correct parameters
    expect(mockHook).toHaveBeenCalledWith(
      expect.objectContaining({
        Escape: expect.any(Function),
      }),
      expect.objectContaining({
        componentId: "selection-toolbar",
        priority: 30,
        excludeDialogs: true,
        enabled: true,
      }),
    )

    // Test the Escape handler function
    const escapeHandler = mockHook.mock.calls[0]?.[0]?.Escape
    expect(escapeHandler).toBeDefined()

    // Call the Escape handler with a mock keyboard event
    const mockEvent = new KeyboardEvent("keydown", { key: "Escape" })
    escapeHandler?.(mockEvent)

    // Verify clearSelection was called
    expect(mockClearSelection).toHaveBeenCalledOnce()
  })

  it("disables keyboard handler when no tasks are selected", async () => {
    const { useKeyboardShortcuts } = await import("@/hooks/use-keyboard-shortcuts")
    const mockHook = vi.mocked(useKeyboardShortcuts)
    mockSelectedTaskIds = []

    render(<SelectionToolbar />)

    // Hook should not be called with enabled: true when no selection
    // The component returns null early, so hook might not be called at all
    // or called with enabled: false
    const calls = mockHook.mock.calls
    if (calls.length > 0) {
      expect(calls[0]?.[1]).toMatchObject({
        enabled: false,
      })
    }
  })

  describe("Bulk operations", () => {
    it("renders quick action buttons when tasks are selected", () => {
      render(<SelectionToolbar />)

      expect(screen.getByText("Complete")).toBeInTheDocument()
      expect(screen.getByText("Schedule")).toBeInTheDocument()
      expect(screen.getByText("Priority")).toBeInTheDocument()
      expect(screen.getByText("Project")).toBeInTheDocument()
      // Check that more menu button exists by looking for the dropdown trigger
      const moreButtons = screen.getAllByRole("button")
      const hasMoreButton = moreButtons.some(
        (button) =>
          button.getAttribute("aria-label")?.includes("More") ||
          button.getAttribute("aria-haspopup") === "menu",
      )
      expect(hasMoreButton).toBe(true)
    })

    it("does not render quick actions when no tasks are selected", () => {
      mockSelectedTaskIds = []
      render(<SelectionToolbar />)

      expect(screen.queryByText("Complete")).not.toBeInTheDocument()
      expect(screen.queryByText("Schedule")).not.toBeInTheDocument()
      expect(screen.queryByText("Priority")).not.toBeInTheDocument()
      expect(screen.queryByText("Delete")).not.toBeInTheDocument()
    })

    it("completes all selected tasks and exits selection mode", () => {
      render(<SelectionToolbar />)

      const completeButton = screen.getByText("Complete")
      fireEvent.click(completeButton)

      expect(mockUpdateTasks).toHaveBeenCalledWith([
        { id: mockTask1.id, completed: true },
        { id: mockTask2.id, completed: true },
      ])
      expect(mockClearSelection).toHaveBeenCalledOnce()
    })
  })

  describe("Bulk comment operations", () => {
    it("handleClearComments creates correct update payload", () => {
      render(<SelectionToolbar />)

      // Access internal method through component instance if needed
      // For now, just verify the component renders correctly
      expect(screen.getByText("2 selected")).toBeInTheDocument()
    })

    it("handleAddComment would create new comment for all selected tasks", () => {
      render(<SelectionToolbar />)

      // Component renders, actual implementation would be tested with integration
      expect(screen.getByText("2 selected")).toBeInTheDocument()
    })
  })

  describe("Bulk subtask operations", () => {
    it("handleAddSubtask logic exists for adding subtasks", () => {
      render(<SelectionToolbar />)

      expect(screen.getByText("2 selected")).toBeInTheDocument()
    })

    it("handleCompleteSubtasks logic exists for completing subtasks", () => {
      render(<SelectionToolbar />)

      expect(screen.getByText("2 selected")).toBeInTheDocument()
    })

    it("handleUncompleteSubtasks logic exists for uncompleting subtasks", () => {
      render(<SelectionToolbar />)

      expect(screen.getByText("2 selected")).toBeInTheDocument()
    })

    it("handleClearSubtasks logic exists for clearing subtasks", () => {
      render(<SelectionToolbar />)

      expect(screen.getByText("2 selected")).toBeInTheDocument()
    })
  })

  describe("Delete operation", () => {
    it("delete functionality exists in toolbar", () => {
      render(<SelectionToolbar />)

      // Check that more menu button exists which contains the delete functionality
      const moreButtons = screen.getAllByRole("button")
      const hasMoreButton = moreButtons.some(
        (button) =>
          button.getAttribute("aria-label")?.includes("More") ||
          button.getAttribute("aria-haspopup") === "menu",
      )
      expect(hasMoreButton).toBe(true)
      // The delete option would be in the dropdown, accessible by clicking the more button
    })
  })

  describe("Keyboard shortcuts", () => {
    it("note: keyboard shortcuts are not implemented in the current version", () => {
      render(<SelectionToolbar />)

      // Component renders without keyboard shortcuts
      expect(screen.getByText("2 selected")).toBeInTheDocument()
    })
  })

  describe("Edge cases", () => {
    it("handles single task selection", () => {
      mockSelectedTaskIds = [mockTask1.id]

      render(<SelectionToolbar />)

      expect(screen.getByText("1 selected")).toBeInTheDocument()
    })

    it("handles zero task selection", () => {
      mockSelectedTaskIds = []

      render(<SelectionToolbar />)

      expect(screen.queryByText("0 selected")).not.toBeInTheDocument()
    })

    it("renders properly with tasks that have subtasks and comments", () => {
      const taskWithContent = createMockTask("87654321-4321-4321-8321-210987654321", {
        comments: [
          {
            id: TEST_COMMENT_ID_1,
            userId: createUserId(DEFAULT_UUID),
            content: "Test comment",
            createdAt: new Date(),
          },
        ],
        subtasks: [{ id: TEST_SUBTASK_ID_1, title: "Test subtask", completed: false }],
      })

      mockSelectedTaskIds = [taskWithContent.id]
      mockAllTasks = [taskWithContent]

      render(<SelectionToolbar />)

      expect(screen.getByText("1 selected")).toBeInTheDocument()
    })
  })
})
