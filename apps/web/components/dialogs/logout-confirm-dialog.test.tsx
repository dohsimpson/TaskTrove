import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { LogoutConfirmDialog } from "./logout-confirm-dialog"

// Mock UI components
interface MockComponentProps {
  children?: React.ReactNode
  open?: boolean
  asChild?: boolean
  onClick?: () => void
  variant?: string
  className?: string
}

// Get mock context for accessing props
let capturedOnOpenChange: (open: boolean) => void = () => {}

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({
    children,
    open,
    onOpenChange,
  }: MockComponentProps & { onOpenChange?: (open: boolean) => void }) => {
    if (onOpenChange) capturedOnOpenChange = onOpenChange
    return open ? <div data-testid="alert-dialog">{children}</div> : null
  },
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
    <button data-testid="alert-dialog-cancel" onClick={() => capturedOnOpenChange(false)}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, className }: MockComponentProps) => (
    <button data-testid="button" onClick={onClick} data-variant={variant} className={className}>
      {children}
    </button>
  ),
}))

describe("LogoutConfirmDialog", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnConfirm = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    capturedOnOpenChange = () => {}
  })

  describe("Basic Functionality", () => {
    it("renders when open is true", () => {
      render(
        <LogoutConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />,
      )

      expect(screen.getByTestId("alert-dialog")).toBeInTheDocument()
    })

    it("does not render when open is false", () => {
      render(
        <LogoutConfirmDialog
          open={false}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />,
      )

      expect(screen.queryByTestId("alert-dialog")).not.toBeInTheDocument()
    })

    it("calls onConfirm and onOpenChange when confirm button is clicked", () => {
      render(
        <LogoutConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />,
      )

      const confirmButton = screen.getByTestId("button")
      fireEvent.click(confirmButton)

      expect(mockOnConfirm).toHaveBeenCalledTimes(1)
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it("calls onOpenChange when cancel button is clicked", () => {
      render(
        <LogoutConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />,
      )

      const cancelButton = screen.getByTestId("alert-dialog-cancel")
      fireEvent.click(cancelButton)

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      expect(mockOnConfirm).not.toHaveBeenCalled()
    })
  })

  describe("Content and Messaging", () => {
    it("displays logout-specific title and message", () => {
      render(
        <LogoutConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />,
      )

      expect(screen.getByTestId("alert-dialog-title")).toHaveTextContent("Sign Out")
      expect(screen.getByTestId("alert-dialog-description")).toHaveTextContent(
        "Are you sure you want to sign out? You will need to sign in again to access your tasks.",
      )
      expect(screen.getByTestId("button")).toHaveTextContent("Sign Out")
      expect(screen.getByTestId("alert-dialog-cancel")).toHaveTextContent("Cancel")
    })
  })

  describe("Button Styling", () => {
    it("applies outline variant to confirm button", () => {
      render(
        <LogoutConfirmDialog
          open={true}
          onOpenChange={mockOnOpenChange}
          onConfirm={mockOnConfirm}
        />,
      )

      const button = screen.getByTestId("button")
      expect(button).toHaveAttribute("data-variant", "outline")
    })
  })
})
