import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { ProjectDialog } from "./project-dialog"

// Mock component props interface
interface MockComponentProps {
  children?: React.ReactNode
  open?: boolean
  className?: string
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  variant?: string
  disabled?: boolean
  id?: string
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  autoFocus?: boolean
  htmlFor?: string
  selectedColor?: string
  onColorSelect?: (color: string) => void
  label?: string
  onOpenChange?: (open: boolean) => void
}

// Get the mocked functions
const { useAtomValue, useSetAtom } = vi.hoisted(() => ({
  useAtomValue: vi.fn(),
  useSetAtom: vi.fn(),
}))

// Mock the atoms directly
vi.mock("@tasktrove/atoms", () => ({
  showProjectDialogAtom: { debugLabel: "showProjectDialogAtom" },
  projectDialogContextAtom: { debugLabel: "projectDialogContextAtom" },
  closeProjectDialogAtom: { debugLabel: "closeProjectDialogAtom" },
  addProjectAtom: { debugLabel: "addProjectAtom" },
  addProjectGroupAtom: { debugLabel: "addProjectGroupAtom" },
}))

vi.mock("@/lib/atoms", () => ({
  // Empty mock - moved to @tasktrove/atoms
}))

// Mock Jotai hooks
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue,
    useSetAtom,
  }
})

// Mock UI components
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: MockComponentProps) =>
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children, className }: MockComponentProps) => (
    <div data-testid="dialog-content" className={className}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: MockComponentProps) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: MockComponentProps) => (
    <div data-testid="dialog-title">{children}</div>
  ),
  DialogFooter: ({ children }: MockComponentProps) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}))

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, type, variant, disabled }: MockComponentProps) => (
    <button
      data-testid={`button-${type || "button"}`}
      onClick={onClick}
      type={type}
      data-variant={variant}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/input", () => ({
  Input: ({ id, placeholder, value, onChange, autoFocus }: MockComponentProps) => (
    <input
      data-testid="input"
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      {...(autoFocus && { autoFocus: true })}
    />
  ),
}))

vi.mock("@/components/ui/label", () => ({
  Label: ({ children, htmlFor }: MockComponentProps) => (
    <label data-testid="label" htmlFor={htmlFor}>
      {children}
    </label>
  ),
}))

vi.mock("@/components/ui/custom/color-picker", () => ({
  ColorPicker: ({ selectedColor, onColorSelect, label }: MockComponentProps) => (
    <div data-testid="color-picker">
      {label && <div data-testid="color-picker-label">{label}</div>}
      <div data-testid="color-options">
        {/* Mock 11 color options based on COLOR_OPTIONS */}
        {[
          "#3b82f6",
          "#ef4444",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
          "#f97316",
          "#06b6d4",
          "#84cc16",
          "#ec4899",
          "#6366f1",
          "#6b7280",
        ].map((color, i) => (
          <button
            key={i}
            data-testid={`color-option-${i}`}
            type="button"
            className={selectedColor === color ? "border-foreground" : ""}
            style={{ backgroundColor: color }}
            onClick={() => onColorSelect?.(color)}
          />
        ))}
      </div>
    </div>
  ),
}))

describe("ProjectDialog", () => {
  const mockCloseDialog = vi.fn()
  const mockAddProject = vi.fn()

  // Mock jotai hooks before each test
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock useAtomValue to return appropriate values based on atom
    useAtomValue.mockImplementation((atom) => {
      if (atom?.debugLabel === "showProjectDialogAtom") {
        return true // Dialog is open
      }
      if (atom?.debugLabel === "projectDialogContextAtom") {
        return { mode: "create" } // Default context
      }
      return true // Default fallback
    })

    // Mock useSetAtom to return mock functions based on atom debug labels
    useSetAtom.mockImplementation((atom) => {
      if (atom?.debugLabel === "closeProjectDialogAtom") {
        return mockCloseDialog
      }
      if (atom?.debugLabel === "addProjectAtom") {
        return mockAddProject
      }
      return vi.fn()
    })
  })

  it("renders dialog when open is true", () => {
    render(<ProjectDialog />)

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-header")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-title")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-footer")).toBeInTheDocument()
  })

  it("does not render dialog when open is false", () => {
    useAtomValue.mockImplementation((atom) => {
      if (atom?.debugLabel === "showProjectDialogAtom") {
        return false // Dialog is closed
      }
      if (atom?.debugLabel === "projectDialogContextAtom") {
        return { mode: "create" } // Default context
      }
      return false // Default fallback
    })

    render(<ProjectDialog />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })

  it("displays correct dialog title", () => {
    render(<ProjectDialog />)

    expect(screen.getByTestId("dialog-title")).toHaveTextContent("Add New Project")
  })

  it("renders form elements correctly", () => {
    render(<ProjectDialog />)

    expect(screen.getByTestId("input")).toBeInTheDocument()
    expect(screen.getByTestId("color-picker")).toBeInTheDocument()
    expect(screen.getByTestId("button-submit")).toBeInTheDocument()
    expect(screen.getByTestId("button-button")).toBeInTheDocument()
  })

  it("displays project name input with correct attributes", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    expect(input).toHaveAttribute("id", "project-name")
    expect(input).toHaveAttribute("placeholder", "Enter project name")
  })

  it("renders all color options", () => {
    render(<ProjectDialog />)

    // There should be 11 color options (based on COLOR_OPTIONS constant)
    const colorOptions = screen.getAllByTestId(/color-option-/)
    expect(colorOptions).toHaveLength(11)
  })

  it("handles project name input change", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    fireEvent.change(input, { target: { value: "New Project" } })

    expect(input).toHaveValue("New Project")
  })

  it("handles color selection", () => {
    render(<ProjectDialog />)

    const colorOption = screen.getByTestId("color-option-1")

    fireEvent.click(colorOption) // Click second color option

    // The color should be selected (visual feedback would be through CSS classes)
    expect(colorOption).toHaveClass("border-foreground")
  })

  it("renders color picker with label", () => {
    render(<ProjectDialog />)

    expect(screen.getByTestId("color-picker-label")).toHaveTextContent("Color")
    expect(screen.getByTestId("color-options")).toBeInTheDocument()
  })

  it("disables submit button when project name is empty", () => {
    render(<ProjectDialog />)

    const submitButton = screen.getByTestId("button-submit")
    expect(submitButton).toBeDisabled()
  })

  it("enables submit button when project name is provided", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    fireEvent.change(input, { target: { value: "New Project" } })

    const submitButton = screen.getByTestId("button-submit")
    expect(submitButton).not.toBeDisabled()
  })

  it("handles form submission with valid data", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    const submitButton = screen.getByTestId("button-submit")

    fireEvent.change(input, { target: { value: "Test Project" } })
    fireEvent.click(submitButton)

    expect(mockAddProject).toHaveBeenCalledWith({
      name: "Test Project",
      color: "#3b82f6", // Default first color
    })
    expect(mockCloseDialog).toHaveBeenCalled()
  })

  it("trims whitespace from project name on submission", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    const submitButton = screen.getByTestId("button-submit")

    fireEvent.change(input, { target: { value: "  Test Project  " } })
    fireEvent.click(submitButton)

    expect(mockAddProject).toHaveBeenCalledWith({
      name: "Test Project",
      color: "#3b82f6",
    })
  })

  it("does not submit with empty or whitespace-only project name", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    const submitButton = screen.getByTestId("button-submit")

    fireEvent.change(input, { target: { value: "   " } })

    // Button should be disabled with whitespace-only input
    expect(submitButton).toBeDisabled()

    // Even if we try to click it, nothing should happen
    fireEvent.click(submitButton)

    expect(mockAddProject).not.toHaveBeenCalled()
    // Note: mockCloseDialog might be called due to dialog behavior, so we don't assert on it
  })

  it("handles cancel button click", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    const cancelButton = screen.getByTestId("button-button")

    // Change form values
    fireEvent.change(input, { target: { value: "Test Project" } })

    // Click cancel
    fireEvent.click(cancelButton)

    expect(mockCloseDialog).toHaveBeenCalled()
    expect(mockAddProject).not.toHaveBeenCalled()
  })

  it("resets form after successful submission", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    const submitButton = screen.getByTestId("button-submit")

    // Fill form
    fireEvent.change(input, { target: { value: "Test Project" } })

    // Submit
    fireEvent.click(submitButton)

    // Check that form is reset
    expect(input).toHaveValue("")
  })

  it("resets form after cancel", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    const cancelButton = screen.getByTestId("button-button")

    // Fill form
    fireEvent.change(input, { target: { value: "Test Project" } })

    // Cancel
    fireEvent.click(cancelButton)

    // Check that form is reset
    expect(input).toHaveValue("")
  })

  it("renders with proper CSS classes", () => {
    render(<ProjectDialog />)

    const dialogContent = screen.getByTestId("dialog-content")
    expect(dialogContent).toHaveClass("sm:max-w-[425px]")
  })

  it("submits form with selected color", () => {
    render(<ProjectDialog />)

    const input = screen.getByTestId("input")
    const colorOption = screen.getByTestId("color-option-2")
    const submitButton = screen.getByTestId("button-submit")

    fireEvent.change(input, { target: { value: "Test Project" } })
    fireEvent.click(colorOption) // Click third color option (green)
    fireEvent.click(submitButton)

    expect(mockAddProject).toHaveBeenCalledWith({
      name: "Test Project",
      color: "#10b981", // Green color
    })
  })
})
