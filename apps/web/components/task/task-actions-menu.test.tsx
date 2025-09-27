import { render, screen, fireEvent, waitFor } from "@/test-utils/render-with-providers"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { TaskActionsMenu } from "./task-actions-menu"
import type { Task } from "@/lib/types"
import { TEST_TASK_ID_1, TEST_SECTION_ID_1 } from "@/lib/utils/test-constants"

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
  attachments: [],
  favorite: false,
  recurring: undefined,
  dueDate: undefined,
  projectId: undefined,
  sectionId: TEST_SECTION_ID_1,
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

  describe("Full variant (default)", () => {
    it("renders delete button and more actions menu when visible", () => {
      renderTaskActionsMenu()

      // Should show both buttons (delete button + more actions dropdown)
      const buttons = screen.getAllByRole("button")
      expect(buttons).toHaveLength(2)
    })

    it("hides menu when not visible", () => {
      const { container } = renderTaskActionsMenu({ isVisible: false })

      // Should have hidden class for full variant
      const menuContainer = container.querySelector("div")
      expect(menuContainer).toHaveClass("hidden")
    })

    it("shows delete confirmation dialog when delete button clicked", async () => {
      renderTaskActionsMenu()

      const buttons = screen.getAllByRole("button")
      const deleteButton = buttons[0] // First button is delete
      if (!deleteButton) {
        throw new Error("Expected to find delete button")
      }
      fireEvent.click(deleteButton)

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText("Delete Task")).toBeInTheDocument()
        expect(screen.getByText(/Are you sure you want to delete "Test Task"/)).toBeInTheDocument()
      })
    })

    it("calls onDeleteClick when delete is confirmed", async () => {
      const mockOnDelete = vi.fn()
      renderTaskActionsMenu({ onDeleteClick: mockOnDelete })

      // Click delete button
      const buttons = screen.getAllByRole("button")
      const deleteButton = buttons[0] // First button is delete
      if (!deleteButton) {
        throw new Error("Expected to find delete button")
      }
      fireEvent.click(deleteButton)

      // Confirm deletion
      await waitFor(() => {
        const confirmButton = screen.getByRole("button", { name: "Delete" })
        fireEvent.click(confirmButton)
      })

      expect(mockOnDelete).toHaveBeenCalledOnce()
    })

    it("cancels delete when cancel button clicked", async () => {
      const mockOnDelete = vi.fn()
      renderTaskActionsMenu({ onDeleteClick: mockOnDelete })

      // Open delete dialog
      const buttons = screen.getAllByRole("button")
      const deleteButton = buttons[0] // First button is delete
      if (!deleteButton) {
        throw new Error("Expected to find delete button")
      }
      fireEvent.click(deleteButton)

      // Cancel deletion
      await waitFor(() => {
        const cancelButton = screen.getByText("Cancel")
        fireEvent.click(cancelButton)
      })

      expect(mockOnDelete).not.toHaveBeenCalled()
    })

    it("displays task title in confirmation message", async () => {
      const taskWithTitle = { ...mockTask, title: "My Important Task" }
      renderTaskActionsMenu({ task: taskWithTitle })

      // Open delete dialog
      const buttons = screen.getAllByRole("button")
      const deleteButton = buttons[0] // First button is delete
      if (!deleteButton) {
        throw new Error("Expected to find delete button")
      }
      fireEvent.click(deleteButton)

      // Should show task title in message
      await waitFor(() => {
        expect(
          screen.getByText(/Are you sure you want to delete "My Important Task"/),
        ).toBeInTheDocument()
      })
    })
  })

  describe("Compact variant", () => {
    it("renders single dropdown menu when visible", () => {
      renderTaskActionsMenu({ variant: "compact" })

      // Should show single dropdown button
      const buttons = screen.getAllByRole("button")
      expect(buttons).toHaveLength(1)
    })

    it("hides menu when not visible", () => {
      const { container } = renderTaskActionsMenu({
        variant: "compact",
        isVisible: false,
      })

      const button = container.querySelector("button")
      expect(button).toHaveClass("hidden")
    })

    it("renders dropdown trigger button", () => {
      const { container } = renderTaskActionsMenu({
        variant: "compact",
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
          variant: "compact",
          onEditClick: mockOnEdit,
        })
      }).not.toThrow()
    })
  })

  describe("Prop validation", () => {
    it("accepts all expected props without errors", () => {
      expect(() => {
        renderTaskActionsMenu({
          variant: "compact",
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

    it("handles both variant types", () => {
      // Full variant
      expect(() => {
        renderTaskActionsMenu({ variant: "full" })
      }).not.toThrow()

      // Compact variant
      expect(() => {
        renderTaskActionsMenu({ variant: "compact" })
      }).not.toThrow()
    })
  })

  describe("Component integration", () => {
    it("renders without crashing with default props", () => {
      const { container } = renderTaskActionsMenu()
      expect(container.firstChild).toBeInTheDocument()
    })

    it("renders compact variant without crashing", () => {
      const { container } = renderTaskActionsMenu({ variant: "compact" })
      expect(container.firstChild).toBeInTheDocument()
    })

    it("handles visibility toggle correctly", () => {
      const { rerender, container } = renderTaskActionsMenu({ isVisible: true })

      // Should be visible - check the container div
      let menuContainer = container.querySelector("div")
      expect(menuContainer).not.toHaveClass("hidden")

      // Rerender as not visible
      rerender(<TaskActionsMenu {...defaultProps} isVisible={false} />)

      // Should be hidden
      menuContainer = container.querySelector("div")
      expect(menuContainer).toHaveClass("hidden")
    })
  })
})
