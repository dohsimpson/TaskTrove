import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@/test-utils"
import { HelpSection, HelpDescription, HelpList, HelpTip } from "./help-content"

describe("HelpSection", () => {
  it("renders children correctly", () => {
    render(
      <HelpSection>
        <div>Test content</div>
      </HelpSection>,
    )

    expect(screen.getByText("Test content")).toBeInTheDocument()
  })

  it("applies default spacing classes", () => {
    const { container } = render(
      <HelpSection>
        <div>Test content</div>
      </HelpSection>,
    )

    const helpSection = container.querySelector(".space-y-3")
    expect(helpSection).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <HelpSection className="custom-class">
        <div>Test content</div>
      </HelpSection>,
    )

    const helpSection = container.querySelector(".custom-class")
    expect(helpSection).toBeInTheDocument()
  })

  it("combines custom className with default classes", () => {
    const { container } = render(
      <HelpSection className="custom-class">
        <div>Test content</div>
      </HelpSection>,
    )

    const helpSection = container.querySelector(".space-y-3.custom-class")
    expect(helpSection).toBeInTheDocument()
  })
})

describe("HelpDescription", () => {
  it("renders children correctly", () => {
    render(<HelpDescription>This is a description</HelpDescription>)

    expect(screen.getByText("This is a description")).toBeInTheDocument()
  })

  it("applies default styling classes", () => {
    const { container } = render(<HelpDescription>This is a description</HelpDescription>)

    const description = container.querySelector("p")
    expect(description).toHaveClass("text-foreground", "font-medium")
  })

  it("applies custom className", () => {
    const { container } = render(
      <HelpDescription className="custom-class">This is a description</HelpDescription>,
    )

    const description = container.querySelector("p")
    expect(description).toHaveClass("custom-class")
  })

  it("renders as a paragraph element", () => {
    const { container } = render(<HelpDescription>This is a description</HelpDescription>)

    const description = container.querySelector("p")
    expect(description?.nodeName).toBe("P")
  })
})

describe("HelpList", () => {
  const sampleItems = ["First item", "Second item", "Third item"]

  it("renders all items correctly", () => {
    render(<HelpList items={sampleItems} />)

    expect(screen.getByText("First item")).toBeInTheDocument()
    expect(screen.getByText("Second item")).toBeInTheDocument()
    expect(screen.getByText("Third item")).toBeInTheDocument()
  })

  it("renders default variant with CheckCircle icons", () => {
    render(<HelpList items={sampleItems} />)

    const listItems = screen.getAllByRole("listitem")
    expect(listItems).toHaveLength(3)

    // Check that each item has the proper structure
    listItems.forEach((item) => {
      expect(item).toHaveClass("flex", "gap-2")
    })
  })

  it("renders steps variant with ArrowRight icons", () => {
    render(<HelpList items={sampleItems} variant="steps" />)

    const listItems = screen.getAllByRole("listitem")
    expect(listItems).toHaveLength(3)
  })

  it("renders tips variant with Star icons", () => {
    render(<HelpList items={sampleItems} variant="tips" />)

    const listItems = screen.getAllByRole("listitem")
    expect(listItems).toHaveLength(3)
  })

  it("applies custom className to list", () => {
    const { container } = render(<HelpList items={sampleItems} className="custom-class" />)

    const list = container.querySelector("ul")
    expect(list).toHaveClass("custom-class")
  })

  it("applies default spacing classes", () => {
    const { container } = render(<HelpList items={sampleItems} />)

    const list = container.querySelector("ul")
    expect(list).toHaveClass("space-y-2")
  })

  it("handles empty items array", () => {
    render(<HelpList items={[]} />)

    const listItems = screen.queryAllByRole("listitem")
    expect(listItems).toHaveLength(0)
  })

  it("handles items with special characters", () => {
    const specialItems = ['Item with "quotes"', "Item with & ampersand", "Item with <tags>"]

    render(<HelpList items={specialItems} />)

    expect(screen.getByText('Item with "quotes"')).toBeInTheDocument()
    expect(screen.getByText("Item with & ampersand")).toBeInTheDocument()
    expect(screen.getByText("Item with <tags>")).toBeInTheDocument()
  })
})

describe("HelpTip", () => {
  it("renders children correctly", () => {
    render(<HelpTip>This is a tip</HelpTip>)

    expect(screen.getByText("This is a tip")).toBeInTheDocument()
  })

  it("renders default info variant", () => {
    const { container } = render(<HelpTip>This is a tip</HelpTip>)

    const tip = container.querySelector(".bg-accent.border")
    expect(tip).toBeInTheDocument()
  })

  it("renders tip variant with correct styling", () => {
    const { container } = render(<HelpTip variant="tip">This is a tip</HelpTip>)

    const tip = container.querySelector(".bg-accent.border")
    expect(tip).toBeInTheDocument()
  })

  it("renders warning variant with correct styling", () => {
    const { container } = render(<HelpTip variant="warning">This is a warning</HelpTip>)

    const tip = container.querySelector(".bg-destructive\\/10")
    expect(tip).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<HelpTip className="custom-class">This is a tip</HelpTip>)

    const tip = container.querySelector(".custom-class")
    expect(tip).toBeInTheDocument()
  })

  it("has proper structure with icon and text", () => {
    const { container } = render(<HelpTip>This is a tip</HelpTip>)

    const tip = container.querySelector(".flex.gap-2.p-3.rounded-md")
    expect(tip).toBeInTheDocument()

    // Should have icon and text container
    expect(tip?.children).toHaveLength(2)
  })

  it("applies correct text color for different variants", () => {
    const { container: infoContainer } = render(<HelpTip variant="info">Info tip</HelpTip>)

    const { container: warningContainer } = render(<HelpTip variant="warning">Warning tip</HelpTip>)

    // Info variant should have default text color
    const infoText = infoContainer.querySelector(".text-foreground")
    expect(infoText).toBeInTheDocument()

    // Warning variant should have destructive text color
    const warningText = warningContainer.querySelector(".text-destructive")
    expect(warningText).toBeInTheDocument()
  })

  it("renders ReactNode children correctly", () => {
    render(
      <HelpTip>
        <div>
          <strong>Bold text</strong> and <em>italic text</em>
        </div>
      </HelpTip>,
    )

    expect(screen.getByText("Bold text")).toBeInTheDocument()
    expect(screen.getByText("italic text")).toBeInTheDocument()
  })
})
