import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { CustomizablePopover, PopoverOption, PopoverSection } from "./customizable-popover"

describe("CustomizablePopover", () => {
  const mockOptions: PopoverOption[] = [
    {
      id: "option1",
      label: "First Option",
      onClick: vi.fn(),
    },
    {
      id: "option2",
      label: "Second Option",
      onClick: vi.fn(),
    },
  ]

  const singleSection: PopoverSection[] = [
    {
      options: mockOptions,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders children as trigger", () => {
    render(
      <CustomizablePopover sections={singleSection}>
        <button>Trigger Button</button>
      </CustomizablePopover>,
    )

    expect(screen.getByRole("button", { name: "Trigger Button" })).toBeInTheDocument()
  })

  it("shows popover content when triggered", () => {
    render(
      <CustomizablePopover sections={singleSection}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    expect(screen.getByText("First Option")).toBeInTheDocument()
    expect(screen.getByText("Second Option")).toBeInTheDocument()
  })

  it("calls option onClick when option is clicked", () => {
    render(
      <CustomizablePopover sections={singleSection}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    const firstOption = screen.getByText("First Option")
    fireEvent.click(firstOption)

    expect(mockOptions[0].onClick).toHaveBeenCalledOnce()
  })

  it("renders options with icons", () => {
    const optionsWithIcons: PopoverOption[] = [
      {
        id: "edit",
        label: "Edit",
        icon: <span data-testid="edit-icon">✏️</span>,
        onClick: vi.fn(),
      },
      {
        id: "delete",
        label: "Delete",
        icon: <span data-testid="delete-icon">🗑️</span>,
        onClick: vi.fn(),
      },
    ]

    const sectionsWithIcons: PopoverSection[] = [{ options: optionsWithIcons }]

    render(
      <CustomizablePopover sections={sectionsWithIcons}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    expect(screen.getByTestId("edit-icon")).toBeInTheDocument()
    expect(screen.getByTestId("delete-icon")).toBeInTheDocument()
  })

  it("renders multiple sections with dividers", () => {
    const multipleSections: PopoverSection[] = [
      {
        options: [
          { id: "edit", label: "Edit", onClick: vi.fn() },
          { id: "duplicate", label: "Duplicate", onClick: vi.fn() },
        ],
      },
      {
        options: [
          { id: "archive", label: "Archive", onClick: vi.fn() },
          { id: "delete", label: "Delete", onClick: vi.fn() },
        ],
      },
    ]

    render(
      <CustomizablePopover sections={multipleSections}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    // Should render all options
    expect(screen.getByText("Edit")).toBeInTheDocument()
    expect(screen.getByText("Duplicate")).toBeInTheDocument()
    expect(screen.getByText("Archive")).toBeInTheDocument()
    expect(screen.getByText("Delete")).toBeInTheDocument()

    // Should have divider between sections
    const dividers = screen.getByRole("dialog").querySelectorAll("div.h-px")
    expect(dividers).toHaveLength(1)
  })

  it("renders section headings when provided", () => {
    const sectionsWithHeadings: PopoverSection[] = [
      {
        heading: "Basic Actions",
        options: [
          { id: "edit", label: "Edit", onClick: vi.fn() },
          { id: "duplicate", label: "Duplicate", onClick: vi.fn() },
        ],
      },
      {
        heading: "Danger Zone",
        options: [{ id: "delete", label: "Delete", onClick: vi.fn() }],
      },
    ]

    render(
      <CustomizablePopover sections={sectionsWithHeadings}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    expect(screen.getByText("Basic Actions")).toBeInTheDocument()
    expect(screen.getByText("Danger Zone")).toBeInTheDocument()
  })

  it("applies custom className to options", () => {
    const optionsWithCustomClass: PopoverOption[] = [
      {
        id: "dangerous",
        label: "Delete",
        onClick: vi.fn(),
        className: "text-red-600 hover:text-red-700",
      },
    ]

    const sections: PopoverSection[] = [{ options: optionsWithCustomClass }]

    render(
      <CustomizablePopover sections={sections}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    const deleteOption = screen.getByText("Delete").closest("button")
    expect(deleteOption).toHaveClass("text-red-600", "hover:text-red-700")
  })

  it("applies custom iconStyle to option icons", () => {
    const optionsWithIconStyle: PopoverOption[] = [
      {
        id: "colored",
        label: "Colored Option",
        icon: <span data-testid="colored-icon">●</span>,
        iconStyle: { color: "red" },
        onClick: vi.fn(),
      },
    ]

    const sections: PopoverSection[] = [{ options: optionsWithIconStyle }]

    render(
      <CustomizablePopover sections={sections}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    const iconContainer = screen.getByTestId("colored-icon").parentElement
    const style = iconContainer ? window.getComputedStyle(iconContainer) : null
    expect(style?.color).toMatch(/rgb\(255,\s*0,\s*0\)|#ff0000|red/i)
  })

  it("applies custom contentClassName", () => {
    render(
      <CustomizablePopover sections={singleSection} contentClassName="w-48 p-2 bg-red-100">
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    // Check if custom classes are applied to popover content
    const popoverContent = screen.getByRole("dialog")
    expect(popoverContent).toHaveClass("w-48", "p-2", "bg-red-100")
  })

  it("applies custom positioning props", () => {
    render(
      <CustomizablePopover sections={singleSection} align="end" side="top">
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    // Positioning props are passed to Radix, we can't easily test them directly
    // but we can verify the popover opens
    expect(screen.getByText("First Option")).toBeInTheDocument()
  })

  it("handles empty sections gracefully", () => {
    const emptySections: PopoverSection[] = []

    render(
      <CustomizablePopover sections={emptySections}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    // Should render popover but with no content
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("handles sections with empty options", () => {
    const sectionsWithEmptyOptions: PopoverSection[] = [
      {
        heading: "Empty Section",
        options: [],
      },
    ]

    render(
      <CustomizablePopover sections={sectionsWithEmptyOptions}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    expect(screen.getByText("Empty Section")).toBeInTheDocument()
    // Should not have any option buttons
    const optionButtons = screen.queryAllByRole("button")
    expect(optionButtons).toHaveLength(1) // Only the trigger button
  })

  it("supports controlled open state", () => {
    const { rerender } = render(
      <CustomizablePopover sections={singleSection} open={false} onOpenChange={vi.fn()}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    // Should not show options when open=false
    expect(screen.queryByText("First Option")).not.toBeInTheDocument()

    // Update to open=true
    rerender(
      <CustomizablePopover sections={singleSection} open={true} onOpenChange={vi.fn()}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    // Should show options when open=true
    expect(screen.getByText("First Option")).toBeInTheDocument()
  })

  it("calls onOpenChange when popover state changes", () => {
    const mockOnOpenChange = vi.fn()

    render(
      <CustomizablePopover sections={singleSection} onOpenChange={mockOnOpenChange}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    expect(mockOnOpenChange).toHaveBeenCalledWith(true)
  })

  it("handles option with number id", () => {
    const optionsWithNumberId: PopoverOption[] = [
      {
        id: 1,
        label: "Numeric ID",
        onClick: vi.fn(),
      },
    ]

    const sections: PopoverSection[] = [{ options: optionsWithNumberId }]

    render(
      <CustomizablePopover sections={sections}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    expect(screen.getByText("Numeric ID")).toBeInTheDocument()
  })

  it("renders options in correct order", () => {
    const orderedOptions: PopoverOption[] = [
      { id: "first", label: "First", onClick: vi.fn() },
      { id: "second", label: "Second", onClick: vi.fn() },
      { id: "third", label: "Third", onClick: vi.fn() },
    ]

    const sections: PopoverSection[] = [{ options: orderedOptions }]

    render(
      <CustomizablePopover sections={sections}>
        <button>Trigger</button>
      </CustomizablePopover>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    fireEvent.click(trigger)

    const buttons = screen.getAllByRole("button")
    const optionButtons = buttons.slice(1) // Remove trigger button

    expect(optionButtons[0]).toHaveTextContent("First")
    expect(optionButtons[1]).toHaveTextContent("Second")
    expect(optionButtons[2]).toHaveTextContent("Third")
  })
})
