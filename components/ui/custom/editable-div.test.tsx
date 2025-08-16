import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { EditableDiv } from "./editable-div"

describe("EditableDiv", () => {
  it("renders with initial value", () => {
    render(<EditableDiv value="Test content" onChange={vi.fn()} />)

    expect(screen.getByText("Test content")).toBeInTheDocument()
  })

  it("renders placeholder when value is empty", () => {
    render(<EditableDiv value="" onChange={vi.fn()} placeholder="Enter text..." />)

    expect(screen.getByText("Enter text...")).toBeInTheDocument()
  })

  it("calls onEditingChange with true when focused", () => {
    const onEditingChange = vi.fn()

    render(
      <EditableDiv value="Test content" onChange={vi.fn()} onEditingChange={onEditingChange} />,
    )

    const element = screen.getByText("Test content")
    fireEvent.focus(element)

    expect(onEditingChange).toHaveBeenCalledWith(true)
  })

  it("calls onEditingChange with false when blurred", () => {
    const onEditingChange = vi.fn()
    const onChange = vi.fn()

    render(
      <EditableDiv value="Test content" onChange={onChange} onEditingChange={onEditingChange} />,
    )

    const element = screen.getByText("Test content")
    fireEvent.focus(element)
    fireEvent.blur(element)

    expect(onEditingChange).toHaveBeenCalledWith(false)
  })

  it("calls onChange when content changes and blurred", () => {
    const onChange = vi.fn()

    render(<EditableDiv value="Initial content" onChange={onChange} />)

    const element = screen.getByText("Initial content")
    fireEvent.focus(element)

    // Simulate content change
    element.textContent = "Updated content"
    fireEvent.blur(element)

    expect(onChange).toHaveBeenCalledWith("Updated content")
  })

  it("does not call onChange when content is unchanged", () => {
    const onChange = vi.fn()
    const onCancel = vi.fn()

    render(<EditableDiv value="Test content" onChange={onChange} onCancel={onCancel} />)

    const element = screen.getByText("Test content")
    fireEvent.focus(element)
    fireEvent.blur(element)

    expect(onChange).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
  })

  it("reverts to original value when allowEmpty is false and content is empty", () => {
    const onChange = vi.fn()
    const onCancel = vi.fn()

    render(
      <EditableDiv
        value="Test content"
        onChange={onChange}
        onCancel={onCancel}
        allowEmpty={false}
      />,
    )

    const element = screen.getByText("Test content")
    fireEvent.focus(element)

    // Clear content
    element.textContent = ""
    fireEvent.blur(element)

    expect(onChange).not.toHaveBeenCalled()
    expect(onCancel).toHaveBeenCalled()
    expect(element.textContent).toBe("Test content")
  })

  it("renders as specified HTML element", () => {
    render(<EditableDiv as="h1" value="Heading content" onChange={vi.fn()} />)

    const element = screen.getByRole("heading", { level: 1 })
    expect(element).toBeInTheDocument()
    expect(element.textContent).toBe("Heading content")
  })

  it("applies custom className", () => {
    render(<EditableDiv value="Test content" onChange={vi.fn()} className="custom-class" />)

    const element = screen.getByText("Test content")
    expect(element).toHaveClass("custom-class")
  })

  it("supports multiline content", () => {
    render(<EditableDiv value="Single line" onChange={vi.fn()} multiline={true} />)

    const element = screen.getByText("Single line")
    expect(element).toHaveClass("whitespace-pre-line")
  })
})
