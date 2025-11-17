import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { MarkdownEditableDiv } from "./markdown-editable-div"

describe("MarkdownEditableDiv", () => {
  it("toggles markdown state when task checkbox is clicked", () => {
    const handleChange = vi.fn()
    render(
      <MarkdownEditableDiv
        value={"- [ ] Todo\n- [x] Done"}
        onChange={handleChange}
        allowEmpty={true}
        multiline={true}
      />,
    )

    const checkboxes = screen.getAllByRole("checkbox")
    expect(checkboxes).toHaveLength(2)
    const secondCheckbox = checkboxes[1]
    if (!secondCheckbox) {
      throw new Error("Expected second checkbox")
    }
    fireEvent.click(secondCheckbox)

    expect(handleChange).toHaveBeenCalledWith("- [ ] Todo\n- [ ] Done")
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("prevents entering edit mode when toggling tasks", () => {
    const handleChange = vi.fn()
    render(<MarkdownEditableDiv value={"- [ ] Todo"} onChange={handleChange} />)

    const checkbox = screen.getByRole("checkbox")
    fireEvent.click(checkbox)
    expect(handleChange).toHaveBeenCalledWith("- [x] Todo")
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  })

  it("applies preview and editing class names appropriately", () => {
    render(
      <MarkdownEditableDiv
        value={"Long description"}
        onChange={vi.fn()}
        className="base"
        previewClassName="preview-clamp"
        editingClassName="editing-expand"
      />,
    )

    const previewContainer = screen.getByText("Long description").closest('[data-action="edit"]')
    expect(previewContainer).toHaveClass("base")
    expect(previewContainer).toHaveClass("preview-clamp")

    if (previewContainer) {
      fireEvent.click(previewContainer)
    }

    const editable = document.querySelector("[contenteditable]")
    expect(editable).not.toBeNull()
    expect(editable).toHaveClass("base")
    expect(editable).toHaveClass("editing-expand")
    expect(editable).toHaveStyle({ maxHeight: "none", overflow: "visible" })
  })

  it("keeps preview clamp off inner markdown renderer", () => {
    render(
      <MarkdownEditableDiv
        value={"Content"}
        onChange={vi.fn()}
        className="base-renderer"
        previewClassName="outer-clamp"
      />,
    )

    const container = screen.getByText("Content").closest('[data-action="edit"]')
    expect(container).toHaveClass("outer-clamp")

    const renderer = container?.querySelector(".markdown-renderer")
    expect(renderer).toHaveClass("base-renderer")
    expect(renderer).not.toHaveClass("outer-clamp")
  })
})
