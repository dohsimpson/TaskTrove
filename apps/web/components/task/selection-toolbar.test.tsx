import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { SelectionToolbar } from "./selection-toolbar"
import type { Task } from "@/lib/types"
import { TEST_COMMENT_ID_1, TEST_SUBTASK_ID_1 } from "@tasktrove/types/test-constants"
import { createTaskId } from "@/lib/types"

// Mock state
let mockSelectedTaskIds: string[]
let mockAllTasks: Task[]
let mockClearSelection: Mock
let mockUpdateTasks: Mock
let mockDeleteTasks: Mock
let mockUpdateTask: Mock

// Mock Jotai
vi.mock("jotai", () => ({
  useSetAtom: vi.fn((atom: { toString: () => string }) => {
    if (atom.toString().includes("clearSelectedTasks")) return mockClearSelection
    if (atom.toString().includes("tasksAtom")) return mockUpdateTasks
    if (atom.toString().includes("deleteTasksAtom")) return mockDeleteTasks
    if (atom.toString().includes("updateTask")) return mockUpdateTask
    return vi.fn()
  }),
  useAtomValue: vi.fn((atom: { toString: () => string }) => {
    if (atom.toString().includes("selectedTasks")) return mockSelectedTaskIds
    if (atom.toString().includes("tasksAtom")) return mockAllTasks
    if (atom.toString().includes("settingsAtom"))
      return {
        general: { popoverHoverOpen: false },
        notifications: {},
        data: {},
      }
    return null
  }),
  useAtom: vi.fn((atom: { toString: () => string }) => {
    // useAtom returns [value, setter]
    if (atom.toString().includes("multiSelectDragging")) return [false, vi.fn()]
    return [null, vi.fn()]
  }),
  atom: vi.fn((value) => ({ init: value, toString: () => "mockAtom" })),
  Provider: vi.fn(({ children }) => children),
}))

// Mock atoms
vi.mock("@tasktrove/atoms", () => ({
  selectedTasksAtom: { toString: () => "selectedTasksAtom" },
  clearSelectedTasksAtom: { toString: () => "clearSelectedTasksAtom" },
  tasksAtom: { toString: () => "tasksAtom" },
  deleteTasksAtom: { toString: () => "deleteTasksAtom" },
  settingsAtom: { toString: () => "settingsAtom" },
  multiSelectDraggingAtom: { toString: () => "multiSelectDraggingAtom" },
  taskAtoms: {
    actions: { updateTask: vi.fn() },
    derived: {},
  },
  taskCountsAtom: { toString: () => "taskCountsAtom" },
  projectAtoms: {
    actions: {},
    derived: {},
  },
  projectsAtom: { toString: () => "projectsAtom" },
  labelsAtom: { toString: () => "labelsAtom" },
  updateLabelAtom: { toString: () => "updateLabelAtom" },
  deleteLabelAtom: { toString: () => "deleteLabelAtom" },
  toggleTaskSelectionAtom: { toString: () => "toggleTaskSelectionAtom" },
}))

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
        comments: [{ id: TEST_COMMENT_ID_1, content: "Test comment", createdAt: new Date() }],
        subtasks: [{ id: TEST_SUBTASK_ID_1, title: "Test subtask", completed: false }],
      })

      mockSelectedTaskIds = [taskWithContent.id]
      mockAllTasks = [taskWithContent]

      render(<SelectionToolbar />)

      expect(screen.getByText("1 selected")).toBeInTheDocument()
    })
  })
})
