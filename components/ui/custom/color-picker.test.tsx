import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { ColorPicker } from "./color-picker"

describe("ColorPicker", () => {
  const mockOnColorSelect = vi.fn()

  beforeEach(() => {
    mockOnColorSelect.mockClear()
  })

  it("renders color options correctly", () => {
    render(<ColorPicker selectedColor="#3b82f6" onColorSelect={mockOnColorSelect} />)

    // Should display color buttons (COLOR_OPTIONS has 11 colors)
    const colorButtons = screen.getAllByRole("button")
    expect(colorButtons.length).toBeGreaterThan(10)
  })

  it("renders with label when provided", () => {
    render(
      <ColorPicker
        selectedColor="#3b82f6"
        onColorSelect={mockOnColorSelect}
        label="Choose Color"
      />,
    )

    expect(screen.getByText("Choose Color")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    render(
      <ColorPicker
        selectedColor="#3b82f6"
        onColorSelect={mockOnColorSelect}
        className="custom-class"
      />,
    )

    const container = document.querySelector(".custom-class")
    expect(container).toBeInTheDocument()
  })

  it("highlights the selected color correctly", () => {
    render(<ColorPicker selectedColor="#ef4444" onColorSelect={mockOnColorSelect} />)

    // Find the red color button
    const redButton = screen.getByTitle("Red")
    expect(redButton).toHaveClass("border-foreground")
    expect(redButton).toHaveClass("ring-2")
  })

  it("calls onColorSelect when a color is clicked", () => {
    render(<ColorPicker selectedColor="#3b82f6" onColorSelect={mockOnColorSelect} />)

    // Click on the green color
    const greenButton = screen.getByTitle("Green")
    fireEvent.click(greenButton)

    expect(mockOnColorSelect).toHaveBeenCalledWith("#10b981")
  })

  it("applies correct size classes", () => {
    const { rerender } = render(
      <ColorPicker selectedColor="#3b82f6" onColorSelect={mockOnColorSelect} size="sm" />,
    )

    let colorButton = screen.getByTitle("Blue")
    expect(colorButton).toHaveClass("size-5")

    rerender(<ColorPicker selectedColor="#3b82f6" onColorSelect={mockOnColorSelect} size="md" />)

    colorButton = screen.getByTitle("Blue")
    expect(colorButton).toHaveClass("size-6")

    rerender(<ColorPicker selectedColor="#3b82f6" onColorSelect={mockOnColorSelect} size="lg" />)

    colorButton = screen.getByTitle("Blue")
    expect(colorButton).toHaveClass("w-7", "h-7")
  })

  it("applies correct background colors to buttons", () => {
    render(<ColorPicker selectedColor="#3b82f6" onColorSelect={mockOnColorSelect} />)

    const blueButton = screen.getByTitle("Blue")
    const redButton = screen.getByTitle("Red")

    expect(blueButton).toHaveStyle({ backgroundColor: "#3b82f6" })
    expect(redButton).toHaveStyle({ backgroundColor: "#ef4444" })
  })

  it("applies hover effects to color buttons", () => {
    render(<ColorPicker selectedColor="#3b82f6" onColorSelect={mockOnColorSelect} />)

    const greenButton = screen.getByTitle("Green")
    expect(greenButton).toHaveClass("hover:scale-110")
    expect(greenButton).toHaveClass("transition-all")
  })

  it("shows different border styles for selected vs unselected colors", () => {
    render(<ColorPicker selectedColor="#8b5cf6" onColorSelect={mockOnColorSelect} />)

    const selectedButton = screen.getByTitle("Purple")
    const unselectedButton = screen.getByTitle("Red")

    // Selected color should have special styling
    expect(selectedButton).toHaveClass("border-foreground", "ring-2")

    // Unselected color should have default styling
    expect(unselectedButton).toHaveClass("border-border")
    expect(unselectedButton).not.toHaveClass("ring-2")
  })

  it("handles all size variants correctly", () => {
    const sizes = ["sm", "md", "lg"] as const
    const expectedClasses = {
      sm: ["size-5"],
      md: ["size-6"],
      lg: ["w-7", "h-7"],
    }

    sizes.forEach((size) => {
      const { unmount } = render(
        <ColorPicker selectedColor="#3b82f6" onColorSelect={mockOnColorSelect} size={size} />,
      )

      const colorButton = screen.getByTitle("Blue")
      expectedClasses[size].forEach((className) => {
        expect(colorButton).toHaveClass(className)
      })

      unmount()
    })
  })
})
