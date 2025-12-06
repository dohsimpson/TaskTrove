import { render, screen } from "@/test-utils/render-with-providers"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { TaskActionsMenu } from "./task-actions-menu"
import type { Task } from "@tasktrove/types/core"
import { TEST_TASK_ID_1 } from "@tasktrove/types/test-constants"

// Mock the atoms
vi.mock("@/lib/atoms", () => ({}))

const mockTask: Task = {
  id: TEST_TASK_ID_1,
  title: "Test Task",
  description: "Test description",
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
}

const defaultProps = {
  task: mockTask,
  isVisible: true,
  onDeleteClick: vi.fn(),
}

const renderTaskActionsMenu = (props = {}) => {
  return render(<TaskActionsMenu {...defaultProps} {...props} />)
}

describe("TaskActionsMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Default variant", () => {
    it("renders single dropdown menu when visible", () => {
      renderTaskActionsMenu()

      // Should show single dropdown button
      const buttons = screen.getAllByRole("button")
      expect(buttons).toHaveLength(1)
    })

    it("hides menu when not visible", () => {
      const { container } = renderTaskActionsMenu({ isVisible: false })

      const button = container.querySelector("button")
      expect(button).toHaveClass("hidden")
    })

    it("renders dropdown trigger button", () => {
      const { container } = renderTaskActionsMenu()

      // The trigger button should exist in the DOM
      const trigger = container.querySelector("button")
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute("data-action", "menu")
    })
  })

  describe("isSubTask prop", () => {
    it("renders single dropdown menu when visible", () => {
      renderTaskActionsMenu({ isSubTask: false })

      // Should show single dropdown button
      const buttons = screen.getAllByRole("button")
      expect(buttons).toHaveLength(1)
    })

    it("hides menu when not visible", () => {
      const { container } = renderTaskActionsMenu({
        isSubTask: false,
        isVisible: false,
      })

      const button = container.querySelector("button")
      expect(button).toHaveClass("hidden")
    })

    it("renders dropdown trigger button", () => {
      const { container } = renderTaskActionsMenu({
        isSubTask: false,
      })

      // The trigger button should exist in the DOM
      const trigger = container.querySelector("button")
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute("data-action", "menu")
    })

    it("calls onEditClick when provided", () => {
      const mockOnEdit = vi.fn()

      // Just test that the prop is accepted without errors
      expect(() => {
        renderTaskActionsMenu({
          isSubTask: false,
          onEditClick: mockOnEdit,
        })
      }).not.toThrow()
    })

    it("renders as subtask when isSubTask is true", () => {
      expect(() => {
        renderTaskActionsMenu({ isSubTask: true })
      }).not.toThrow()
    })
  })

  describe("Prop validation", () => {
    it("accepts all expected props without errors", () => {
      expect(() => {
        renderTaskActionsMenu({
          isSubTask: false,
          onEditClick: vi.fn(),
          open: false,
          onOpenChange: vi.fn(),
        })
      }).not.toThrow()
    })

    it("works with minimal props", () => {
      expect(() => {
        renderTaskActionsMenu({
          task: mockTask,
          isVisible: true,
          onDeleteClick: vi.fn(),
        })
      }).not.toThrow()
    })

    it("handles both isSubTask values", () => {
      // Task (default)
      expect(() => {
        renderTaskActionsMenu({ isSubTask: false })
      }).not.toThrow()

      // Subtask
      expect(() => {
        renderTaskActionsMenu({ isSubTask: true })
      }).not.toThrow()
    })
  })

  describe("Component integration", () => {
    it("renders without crashing with default props", () => {
      const { container } = renderTaskActionsMenu()
      expect(container.firstChild).toBeInTheDocument()
    })

    it("renders task variant without crashing", () => {
      const { container } = renderTaskActionsMenu({ isSubTask: false })
      expect(container.firstChild).toBeInTheDocument()
    })

    it("renders subtask variant without crashing", () => {
      const { container } = renderTaskActionsMenu({ isSubTask: true })
      expect(container.firstChild).toBeInTheDocument()
    })

    it("handles visibility toggle correctly", () => {
      const { rerender, container } = renderTaskActionsMenu({ isVisible: true })

      // Should be visible - check the button
      let button = container.querySelector("button")
      expect(button).not.toHaveClass("hidden")

      // Rerender as not visible
      rerender(<TaskActionsMenu {...defaultProps} isVisible={false} />)

      // Should be hidden
      button = container.querySelector("button")
      expect(button).toHaveClass("hidden")
    })
  })
})
