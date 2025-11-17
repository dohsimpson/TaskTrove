import React from "react"
import { render, screen, fireEvent } from "@/test-utils"
import { describe, it, expect, beforeEach, vi } from "vitest"
import { LinkifiedEditableDiv } from "./linkified-editable-div"

// Note: Atom mocks are now centralized in test-utils/atoms-mocks.ts

// Mock Jotai
vi.mock("jotai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("jotai")>()
  return {
    ...actual,
    useAtomValue: vi.fn(() => ({ general: { linkifyEnabled: true } })),
  }
})

// Mock ClickToEdit wrapper
vi.mock("./click-to-edit", () => ({
  ClickToEdit: ({
    renderView,
    onEditingChange,
    value,
    className,
    placeholder,
  }: {
    renderView: (onClick: (event: React.MouseEvent<HTMLElement>) => void) => React.ReactNode
    onEditingChange?: (isEditing: boolean) => void
    value?: string
    className?: string
    placeholder?: string
    [key: string]: unknown
  }) => {
    const [isEditing, setIsEditing] = React.useState(false)

    const handleClick = () => {
      setIsEditing(true)
      onEditingChange?.(true)
    }

    if (isEditing) {
      // Render EditableDiv in edit mode
      return (
        <div data-testid="editable-div" className={className} data-placeholder={placeholder}>
          {value}
        </div>
      )
    }

    // Render view mode using renderView
    return <>{renderView(handleClick)}</>
  },
}))

// Mock the child components
vi.mock("./editable-div", () => ({
  EditableDiv: ({
    value,
    className,
    placeholder,
    multiline,
    allowEmpty,
    onEditingChange,
    cursorPosition,
    onCancel,
    onChange,
    ...props
  }: {
    value: string
    className?: string
    placeholder?: string
    children?: React.ReactNode
    multiline?: boolean
    allowEmpty?: boolean
    onEditingChange?: (isEditing: boolean) => void
    cursorPosition?: string | number
    onCancel?: () => void
    onChange?: (value: string) => void
    [key: string]: unknown
  }) => {
    // Filter out non-DOM props to avoid TypeScript errors
    void multiline
    void allowEmpty
    void onEditingChange
    void cursorPosition
    void onCancel
    void onChange

    return (
      <div
        data-testid="editable-div"
        className={className}
        data-placeholder={placeholder}
        {...props}
      >
        {value}
      </div>
    )
  },
}))

vi.mock("./linkified-text", () => ({
  LinkifiedText: ({
    children,
    className,
    onClick,
    ...props
  }: {
    children?: React.ReactNode
    className?: string
    onClick?: () => void
    [key: string]: unknown
  }) => (
    <div data-testid="linkified-text" className={className} onClick={onClick} {...props}>
      {children}
    </div>
  ),
}))

describe("LinkifiedEditableDiv", () => {
  const mockOnChange = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders LinkifiedText by default", () => {
    render(
      <LinkifiedEditableDiv value="Test content" onChange={mockOnChange} onCancel={mockOnCancel} />,
    )

    expect(screen.getByTestId("linkified-text")).toBeInTheDocument()
    expect(screen.getByText("Test content")).toBeInTheDocument()
    expect(screen.queryByTestId("editable-div")).not.toBeInTheDocument()
  })

  it("switches to EditableDiv when clicked", () => {
    render(
      <LinkifiedEditableDiv value="Test content" onChange={mockOnChange} onCancel={mockOnCancel} />,
    )

    const linkifiedText = screen.getByTestId("linkified-text")
    fireEvent.click(linkifiedText)

    expect(screen.getByTestId("editable-div")).toBeInTheDocument()
    expect(screen.queryByTestId("linkified-text")).not.toBeInTheDocument()
  })

  it("passes through props correctly to LinkifiedText", () => {
    render(
      <LinkifiedEditableDiv
        value="Test content"
        onChange={mockOnChange}
        className="test-class"
        data-testid="custom-test"
      />,
    )

    const linkifiedText = screen.getByTestId("custom-test")
    expect(linkifiedText).toHaveClass("cursor-text")
    expect(linkifiedText).toHaveClass("test-class")
    expect(linkifiedText).toHaveAttribute("data-testid", "custom-test")
    expect(linkifiedText).toHaveAttribute("data-action", "edit")
  })

  it("passes through props correctly to EditableDiv", () => {
    render(
      <LinkifiedEditableDiv
        value="Test content"
        onChange={mockOnChange}
        className="test-class"
        placeholder="Enter text"
        autoFocus={true}
      />,
    )

    // Click to enter edit mode
    fireEvent.click(screen.getByTestId("linkified-text"))

    const editableDiv = screen.getByTestId("editable-div")
    expect(editableDiv).toHaveClass("test-class")
    expect(editableDiv).toHaveAttribute("data-placeholder", "Enter text")
  })

  it("handles editing state changes correctly", () => {
    const mockOnEditingChange = vi.fn()

    render(
      <LinkifiedEditableDiv
        value="Test content"
        onChange={mockOnChange}
        onEditingChange={mockOnEditingChange}
      />,
    )

    // Click to enter edit mode
    fireEvent.click(screen.getByTestId("linkified-text"))

    expect(mockOnEditingChange).toHaveBeenCalledWith(true)
  })

  it("renders placeholder when value is empty", () => {
    render(<LinkifiedEditableDiv value="" onChange={mockOnChange} placeholder="Enter some text" />)

    expect(screen.getByText("Enter some text")).toBeInTheDocument()
  })
})
