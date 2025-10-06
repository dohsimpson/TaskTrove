import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { SimpleInputDialog } from "./simple-input-dialog"

// Mock component interfaces
interface MockButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  size?: string
  className?: string
}

interface MockInputProps {
  value?: string
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

interface MockDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface MockDialogContentProps {
  children: React.ReactNode
  className?: string
}

interface MockDialogHeaderProps {
  children: React.ReactNode
}

interface MockDialogTitleProps {
  children: React.ReactNode
}

// Mock dependencies
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, size, className }: MockButtonProps) => (
    <button onClick={onClick} disabled={disabled} data-size={size} className={className}>
      {children}
    </button>
  ),
}))

vi.mock("@/components/ui/input", () => ({
  Input: ({ value, onChange, onKeyDown, placeholder, className, autoFocus }: MockInputProps) => (
    <input
      type="text"
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      data-testid="input"
      data-autofocus={autoFocus}
    />
  ),
}))

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open, onOpenChange }: MockDialogProps) =>
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange?.(false)}>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children, className }: MockDialogContentProps) => (
    <div className={className} data-testid="dialog-content" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: MockDialogHeaderProps) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: MockDialogTitleProps) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
}))

describe("SimpleInputDialog", () => {
  const mockOnOpenChange = vi.fn()
  const mockOnChange = vi.fn()
  const mockOnSubmit = vi.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    title: "Test Dialog",
    value: "",
    onChange: mockOnChange,
    onSubmit: mockOnSubmit,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("does not render when open is false", () => {
    render(<SimpleInputDialog {...defaultProps} open={false} />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()
  })

  it("renders dialog when open is true", () => {
    render(<SimpleInputDialog {...defaultProps} />)

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-content")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-header")).toBeInTheDocument()
    expect(screen.getByTestId("dialog-title")).toBeInTheDocument()
  })

  it("displays title in dialog header", () => {
    render(<SimpleInputDialog {...defaultProps} title="Add New Item" />)

    expect(screen.getByText("Add New Item")).toBeInTheDocument()
  })

  it("renders input with default placeholder", () => {
    render(<SimpleInputDialog {...defaultProps} />)

    const input = screen.getByTestId("input")
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute("placeholder", "Enter text...")
  })

  it("renders input with custom placeholder", () => {
    render(<SimpleInputDialog {...defaultProps} placeholder="Enter comment..." />)

    const input = screen.getByTestId("input")
    expect(input).toHaveAttribute("placeholder", "Enter comment...")
  })

  it("displays current value in input", () => {
    render(<SimpleInputDialog {...defaultProps} value="Test value" />)

    const input = screen.getByTestId("input")
    expect(input).toHaveValue("Test value")
  })

  it("calls onChange when typing in input", async () => {
    const onChange = vi.fn()
    render(<SimpleInputDialog {...defaultProps} onChange={onChange} />)

    const input = screen.getByTestId("input")
    await userEvent.type(input, "New text")

    // onChange is called for each character typed
    expect(onChange).toHaveBeenCalled()
  })

  it("renders submit button with default text", () => {
    render(<SimpleInputDialog {...defaultProps} />)

    expect(screen.getByText("Add")).toBeInTheDocument()
  })

  it("renders submit button with custom text", () => {
    render(<SimpleInputDialog {...defaultProps} buttonText="Create" />)

    expect(screen.getByText("Create")).toBeInTheDocument()
  })

  it("disables submit button when value is empty", () => {
    render(<SimpleInputDialog {...defaultProps} value="" />)

    const submitButton = screen.getByText("Add")
    expect(submitButton).toBeDisabled()
  })

  it("disables submit button when value is only whitespace", () => {
    render(<SimpleInputDialog {...defaultProps} value="   " />)

    const submitButton = screen.getByText("Add")
    expect(submitButton).toBeDisabled()
  })

  it("enables submit button when value has content", () => {
    render(<SimpleInputDialog {...defaultProps} value="Valid content" />)

    const submitButton = screen.getByText("Add")
    expect(submitButton).not.toBeDisabled()
  })

  it("calls onSubmit when submit button is clicked", async () => {
    const onSubmit = vi.fn()
    render(<SimpleInputDialog {...defaultProps} value="Test" onSubmit={onSubmit} />)

    const submitButton = screen.getByText("Add")
    await userEvent.click(submitButton)

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it("calls onSubmit when Enter key is pressed", () => {
    const onSubmit = vi.fn()
    render(<SimpleInputDialog {...defaultProps} value="Test" onSubmit={onSubmit} />)

    const input = screen.getByTestId("input")
    fireEvent.keyDown(input, { key: "Enter" })

    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it("prevents default behavior when Enter key is pressed", () => {
    render(<SimpleInputDialog {...defaultProps} value="Test" />)

    const input = screen.getByTestId("input")
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })
    const preventDefault = vi.spyOn(event, "preventDefault")

    input.dispatchEvent(event)

    expect(preventDefault).toHaveBeenCalled()
  })

  it("does not call onSubmit when other keys are pressed", () => {
    const onSubmit = vi.fn()
    render(<SimpleInputDialog {...defaultProps} value="Test" onSubmit={onSubmit} />)

    const input = screen.getByTestId("input")
    fireEvent.keyDown(input, { key: "Escape" })
    fireEvent.keyDown(input, { key: "Tab" })
    fireEvent.keyDown(input, { key: "Space" })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("sets autoFocus on input", () => {
    render(<SimpleInputDialog {...defaultProps} />)

    const input = screen.getByTestId("input")
    // Check that autoFocus is passed to the input
    expect(input).toHaveAttribute("data-autofocus", "true")
  })

  it("closes dialog when clicking outside content area", async () => {
    const onOpenChange = vi.fn()
    render(<SimpleInputDialog {...defaultProps} onOpenChange={onOpenChange} />)

    const dialog = screen.getByTestId("dialog")
    await userEvent.click(dialog)

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("does not close dialog when clicking inside content area", async () => {
    const onOpenChange = vi.fn()
    render(<SimpleInputDialog {...defaultProps} onOpenChange={onOpenChange} />)

    const dialogContent = screen.getByTestId("dialog-content")
    await userEvent.click(dialogContent)

    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("renders all components without errors", () => {
    const { container } = render(<SimpleInputDialog {...defaultProps} />)

    expect(container.firstChild).toBeInTheDocument()
  })

  it("handles rapid state changes", () => {
    const { rerender } = render(<SimpleInputDialog {...defaultProps} value="" />)

    // Rapidly change value
    rerender(<SimpleInputDialog {...defaultProps} value="a" />)
    rerender(<SimpleInputDialog {...defaultProps} value="ab" />)
    rerender(<SimpleInputDialog {...defaultProps} value="abc" />)

    const input = screen.getByTestId("input")
    expect(input).toHaveValue("abc")
  })

  it("handles toggle between open and closed states", () => {
    const { rerender } = render(<SimpleInputDialog {...defaultProps} open={true} />)

    expect(screen.getByTestId("dialog")).toBeInTheDocument()

    rerender(<SimpleInputDialog {...defaultProps} open={false} />)

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument()

    rerender(<SimpleInputDialog {...defaultProps} open={true} />)

    expect(screen.getByTestId("dialog")).toBeInTheDocument()
  })
})
