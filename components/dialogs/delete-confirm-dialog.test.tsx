import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, mockNextThemes } from "@/test-utils"
import { DeleteConfirmDialog, DeleteEntityType } from "./delete-confirm-dialog"

// Mock UI components
interface MockComponentProps {
  children?: React.ReactNode
  open?: boolean
  asChild?: boolean
  onClick?: () => void
  variant?: string
  className?: string
}

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: MockComponentProps) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: MockComponentProps) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: MockComponentProps) => (
    <div data-testid="alert-dialog-header">{children}</div>
  ),
  AlertDialogTitle: ({ children }: MockComponentProps) => (
    <div data-testid="alert-dialog-title">{children}</div>
  ),
  AlertDialogDescription: ({ children }: MockComponentProps) => (
    <div data-testid="alert-dialog-description">{children}</div>
  ),
  AlertDialogFooter: ({ children }: MockComponentProps) => (
    <div data-testid="alert-dialog-footer">{children}</div>
  ),
  AlertDialogAction: ({ children, asChild }: MockComponentProps) =>
    asChild ? children : <button data-testid="alert-dialog-action">{children}</button>,
  AlertDialogCancel: ({ children }: MockComponentProps) => (
    <button data-testid="alert-dialog-cancel">{children}</button>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, className }: MockComponentProps) => (
    <button data-testid="button" onClick={onClick} data-variant={variant} className={className}>
      {children}
    </button>
  ),
}))

// Mock next-themes
mockNextThemes()

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe("DeleteConfirmDialog", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Basic Functionality", () => {
    it("renders when open is true", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
          entityName="Test Task"
        />,
      )

      expect(screen.getByTestId("alert-dialog")).toBeInTheDocument()
    })

    it("does not render when open is false", () => {
      render(
        <DeleteConfirmDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
          entityName="Test Task"
        />,
      )

      expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument()
    })

    it("calls onConfirm and onOpenChange when confirm button is clicked", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
          entityName="Test Task"
        />,
      )

      const confirmButton = screen.getByTestId("button")
      fireEvent.click(confirmButton)

      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe("Entity Type Messages", () => {
    it("displays correct message for task deletion", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
          entityName="My Important Task"
        />,
      )

      expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Delete Task")
      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
        'Are you sure you want to delete "My Important Task"? This action cannot be undone.',
      )
      expect(screen.getByTestId("button")).toHaveTextContent("Delete")
    })

    it("displays correct message for project deletion", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="project"
          entityName="Work Project"
        />,
      )

      expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Delete Project")
      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
        'Are you sure you want to delete "Work Project"? This action cannot be undone and will remove all tasks in this project.',
      )
      expect(screen.getByTestId("button")).toHaveTextContent("Delete Project")
    })

    it("displays correct message for label deletion", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="label"
          entityName="Important"
        />,
      )

      expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Delete Label")
      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
        'Are you sure you want to delete "Important"? This action cannot be undone and will remove this label from all tasks.',
      )
      expect(screen.getByTestId("button")).toHaveTextContent("Delete Label")
    })

    it("displays correct message for history clearing", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="history"
        />,
      )

      expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Clear All History")
      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
        "This will permanently clear all undo/redo history for tasks, projects, and labels. This action cannot be undone.",
      )
      expect(screen.getByTestId("button")).toHaveTextContent("Clear History")
    })

    it("displays correct message for bulk deletion", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="bulk"
          entityCount={5}
        />,
      )

      expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Delete Tasks")
      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
        "Are you sure you want to delete 5 tasks? This action cannot be undone.",
      )
      expect(screen.getByTestId("button")).toHaveTextContent("Delete Tasks")
    })

    it("handles singular bulk deletion correctly", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="bulk"
          entityCount={1}
        />,
      )

      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
        "Are you sure you want to delete 1 task? This action cannot be undone.",
      )
    })
  })

  describe("Custom Props", () => {
    it("displays custom message when provided", () => {
      const customMessage = "This is a custom deletion message."

      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
          entityName="Test Task"
          customMessage={customMessage}
        />,
      )

      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(customMessage)
    })

    it("displays custom confirm button text when provided", () => {
      const customButtonText = "Remove Forever"

      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
          entityName="Test Task"
          confirmButtonText={customButtonText}
        />,
      )

      expect(screen.getByTestId("button")).toHaveTextContent(customButtonText)
    })
  })

  describe("Button Variants", () => {
    it("applies destructive styling by default", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
          entityName="Test Task"
        />,
      )

      const button = screen.getByTestId("button")
      expect(button).toHaveAttribute("data-variant", "outline")
      expect(button).toHaveClass(
        "border border-red-600 text-red-600 hover:text-red-700 bg-transparent hover:bg-transparent cursor-pointer",
      )
    })

    it("applies default styling when variant is default", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
          entityName="Test Task"
          variant="default"
        />,
      )

      const button = screen.getByTestId("button")
      expect(button).toHaveAttribute("data-variant", "default")
      expect(button).not.toHaveClass(
        "border border-red-600 text-red-600 hover:text-red-700 bg-transparent hover:bg-transparent cursor-pointer",
      )
    })
  })

  describe("Type Safety", () => {
    it("accepts all valid entity types", () => {
      const entityTypes: DeleteEntityType[] = ["task", "project", "label", "history", "bulk"]

      entityTypes.forEach((entityType) => {
        const { unmount } = render(
          <DeleteConfirmDialog
            open={true}
            onOpenChange={mockOnOpenChange}
            onConfirm={mockOnConfirm}
            entityType={entityType}
            entityName="Test"
          />,
        )

        expect(screen.getByTestId("alert-dialog")).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe("Edge Cases", () => {
    it("handles missing entity name gracefully", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
        />,
      )

      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
        'Are you sure you want to delete ""? This action cannot be undone.',
      )
    })

    it("handles bulk deletion without count gracefully", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="bulk"
        />,
      )

      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
        "Are you sure you want to delete 0 tasks? This action cannot be undone.",
      )
    })
  })

  describe("Cancel Button", () => {
    it("renders cancel button", () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
          entityType="task"
          entityName="Test Task"
        />,
      )

      expect(screen.getByTestId("alert-dialog-cancel")).toHaveTextContent("Cancel")
    })
  })
})
