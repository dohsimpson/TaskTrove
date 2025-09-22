import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { MultiSelect, MultiSelectOption } from "./multi-select"

const mockOptions: MultiSelectOption<string>[] = [
  { value: "1", label: "First" },
  { value: "2", label: "Second" },
  { value: "3", label: "Third" },
]

const mockNumberOptions: MultiSelectOption<number>[] = [
  { value: 1, label: "One" },
  { value: 2, label: "Two" },
  { value: 3, label: "Three" },
]

describe("MultiSelect", () => {
  it("renders with placeholder when no items selected", () => {
    render(
      <MultiSelect
        options={mockOptions}
        value={[]}
        onValueChange={vi.fn()}
        placeholder="Select items..."
      />,
    )

    expect(screen.getByText("Select items...")).toBeInTheDocument()
  })

  it("displays selected items when less than maxDisplay", () => {
    render(
      <MultiSelect
        options={mockOptions}
        value={["1", "2"]}
        onValueChange={vi.fn()}
        maxDisplay={3}
      />,
    )

    expect(screen.getByText("First, Second")).toBeInTheDocument()
  })

  it("displays count when more than maxDisplay", () => {
    render(
      <MultiSelect
        options={mockOptions}
        value={["1", "2", "3"]}
        onValueChange={vi.fn()}
        maxDisplay={2}
      />,
    )

    expect(screen.getByText("3 selected")).toBeInTheDocument()
  })

  it("opens dropdown when clicked", () => {
    render(<MultiSelect options={mockOptions} value={[]} onValueChange={vi.fn()} />)

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    expect(screen.getByText("First")).toBeInTheDocument()
    expect(screen.getByText("Second")).toBeInTheDocument()
    expect(screen.getByText("Third")).toBeInTheDocument()
  })

  it("selects and deselects items", () => {
    const onValueChange = vi.fn()
    render(<MultiSelect options={mockOptions} value={["1"]} onValueChange={onValueChange} />)

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    // Select second item (find all and click the one in the dropdown)
    const secondItems = screen.getAllByText("Second")
    const secondDropdownItem = secondItems.find((item) => item.closest(".max-h-60"))
    expect(secondDropdownItem).toBeTruthy()
    if (secondDropdownItem) {
      fireEvent.click(secondDropdownItem)
    }
    expect(onValueChange).toHaveBeenCalledWith(["1", "2"])

    // Deselect first item (find the one in the dropdown)
    const firstItems = screen.getAllByText("First")
    const firstDropdownItem = firstItems.find((item) => item.closest(".max-h-60"))
    expect(firstDropdownItem).toBeTruthy()
    if (firstDropdownItem) {
      fireEvent.click(firstDropdownItem)
    }
    expect(onValueChange).toHaveBeenCalledWith([])
  })

  it("works with number values", () => {
    const onValueChange = vi.fn()
    render(<MultiSelect options={mockNumberOptions} value={[1]} onValueChange={onValueChange} />)

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    const secondItem = screen.getByText("Two")
    fireEvent.click(secondItem)
    expect(onValueChange).toHaveBeenCalledWith([1, 2])
  })

  it("applies custom className", () => {
    render(
      <MultiSelect
        options={mockOptions}
        value={[]}
        onValueChange={vi.fn()}
        className="custom-class"
      />,
    )

    const trigger = screen.getByRole("combobox")
    expect(trigger).toHaveClass("custom-class")
  })

  it("applies small size correctly", () => {
    render(<MultiSelect options={mockOptions} value={[]} onValueChange={vi.fn()} size="sm" />)

    const trigger = screen.getByRole("combobox")
    expect(trigger).toHaveClass("h-8", "text-sm")
  })

  it("shows checkmarks for selected items", () => {
    render(<MultiSelect options={mockOptions} value={["1", "3"]} onValueChange={vi.fn()} />)

    const trigger = screen.getByRole("combobox")
    fireEvent.click(trigger)

    // Check that selected items have the selected styling (bg-primary)
    const selectedItems = document.querySelectorAll(".bg-primary")
    expect(selectedItems.length).toBe(2) // Should have 2 selected checkboxes

    // Verify check icons are present
    const checkIcons = document.querySelectorAll(".lucide-check")
    expect(checkIcons.length).toBe(2) // Should have 2 check icons
  })
})
