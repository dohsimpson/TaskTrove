import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ColorPickerPopover } from "./color-picker-popover"

describe("ColorPickerPopover", () => {
  const mockOnColorSelect = vi.fn()

  beforeEach(() => {
    mockOnColorSelect.mockClear()
  })

  it("renders trigger children correctly", () => {
    render(
      <ColorPickerPopover selectedColor="#3b82f6" onColorSelect={mockOnColorSelect}>
        <button>Open Color Picker</button>
      </ColorPickerPopover>,
    )

    expect(screen.getByText("Open Color Picker")).toBeInTheDocument()
  })

  it("shows color picker when trigger is clicked", async () => {
    render(
      <ColorPickerPopover selectedColor="#3b82f6" onColorSelect={mockOnColorSelect}>
        <button>Open Color Picker</button>
      </ColorPickerPopover>,
    )

    const trigger = screen.getByText("Open Color Picker")
    fireEvent.click(trigger)

    // Should show the popover content
    expect(screen.getByText("Select Color")).toBeInTheDocument()
  })

  it("displays all color options", async () => {
    render(
      <ColorPickerPopover selectedColor="#3b82f6" onColorSelect={mockOnColorSelect}>
        <button>Open Color Picker</button>
      </ColorPickerPopover>,
    )

    const trigger = screen.getByText("Open Color Picker")
    fireEvent.click(trigger)

    // Should display color buttons (COLOR_OPTIONS has 11 colors)
    const colorButtons = screen
      .getAllByRole("button")
      .filter((btn) => btn.title && btn.title !== "Open Color Picker")
    expect(colorButtons.length).toBeGreaterThan(10)
  })

  it("highlights the selected color correctly", async () => {
    render(
      <ColorPickerPopover selectedColor="#ef4444" onColorSelect={mockOnColorSelect}>
        <button>Open Color Picker</button>
      </ColorPickerPopover>,
    )

    const trigger = screen.getByText("Open Color Picker")
    fireEvent.click(trigger)

    // Find the red color button
    const redButton = screen.getByTitle("Red")
    expect(redButton).toHaveClass("border-foreground")
    expect(redButton).toHaveClass("ring-2")
  })

  it("calls onColorSelect when a color is clicked", async () => {
    render(
      <ColorPickerPopover selectedColor="#3b82f6" onColorSelect={mockOnColorSelect}>
        <button>Open Color Picker</button>
      </ColorPickerPopover>,
    )

    const trigger = screen.getByText("Open Color Picker")
    fireEvent.click(trigger)

    // Click on the green color
    const greenButton = screen.getByTitle("Green")
    fireEvent.click(greenButton)

    expect(mockOnColorSelect).toHaveBeenCalledWith("#10b981")
  })

  it("supports controlled open state", () => {
    const mockOnOpenChange = vi.fn()

    render(
      <ColorPickerPopover
        selectedColor="#3b82f6"
        onColorSelect={mockOnColorSelect}
        open={true}
        onOpenChange={mockOnOpenChange}
      >
        <button>Open Color Picker</button>
      </ColorPickerPopover>,
    )

    // Should be open by default
    expect(screen.getByText("Select Color")).toBeInTheDocument()
  })

  it("closes popover after color selection", async () => {
    render(
      <ColorPickerPopover selectedColor="#3b82f6" onColorSelect={mockOnColorSelect}>
        <button>Open Color Picker</button>
      </ColorPickerPopover>,
    )

    const trigger = screen.getByText("Open Color Picker")
    fireEvent.click(trigger)

    // Should be open
    expect(screen.getByText("Select Color")).toBeInTheDocument()

    // Click on a color
    const purpleButton = screen.getByTitle("Purple")
    fireEvent.click(purpleButton)

    // Should close (content should no longer be visible)
    expect(screen.queryByText("Select Color")).not.toBeInTheDocument()
  })

  it("applies correct styling to color buttons", async () => {
    render(
      <ColorPickerPopover selectedColor="#3b82f6" onColorSelect={mockOnColorSelect}>
        <button>Open Color Picker</button>
      </ColorPickerPopover>,
    )

    const trigger = screen.getByText("Open Color Picker")
    fireEvent.click(trigger)

    const blueButton = screen.getByTitle("Blue")
    const redButton = screen.getByTitle("Red")

    // Selected color should have special styling
    expect(blueButton).toHaveClass("border-foreground", "ring-2")

    // Non-selected color should have default styling
    expect(redButton).toHaveClass("border-border")
    expect(redButton).not.toHaveClass("ring-2")
  })

  it("supports different alignment options", () => {
    render(
      <ColorPickerPopover
        selectedColor="#3b82f6"
        onColorSelect={mockOnColorSelect}
        align="end"
        side="top"
      >
        <button>Open Color Picker</button>
      </ColorPickerPopover>,
    )

    expect(screen.getByText("Open Color Picker")).toBeInTheDocument()
  })
})
