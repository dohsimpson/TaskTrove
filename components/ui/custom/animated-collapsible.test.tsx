import { describe, it, expect } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./animated-collapsible"

describe("AnimatedCollapsible", () => {
  it("renders collapsible with trigger and content", () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>,
    )

    expect(screen.getByText("Toggle")).toBeInTheDocument()
    expect(screen.getByText("Content")).toBeInTheDocument()
  })

  it("applies animation classes by default", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>,
    )

    const content = screen.getByTestId("content")
    expect(content).toHaveClass("overflow-hidden")
    expect(content).toHaveClass("data-[state=closed]:animate-collapsible-up")
    expect(content).toHaveClass("data-[state=open]:animate-collapsible-down")
  })

  it("does not apply animation classes when animate is false", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent animate={false} data-testid="content">
          Content
        </CollapsibleContent>
      </Collapsible>,
    )

    const content = screen.getByTestId("content")
    expect(content).not.toHaveClass("overflow-hidden")
    expect(content).not.toHaveClass("data-[state=closed]:animate-collapsible-up")
    expect(content).not.toHaveClass("data-[state=open]:animate-collapsible-down")
  })

  it("merges custom className with animation classes", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent className="custom-class" data-testid="content">
          Content
        </CollapsibleContent>
      </Collapsible>,
    )

    const content = screen.getByTestId("content")
    expect(content).toHaveClass("custom-class")
    expect(content).toHaveClass("overflow-hidden")
    expect(content).toHaveClass("data-[state=closed]:animate-collapsible-up")
  })

  it("toggles content visibility when trigger is clicked", () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>,
    )

    const trigger = screen.getByText("Toggle")
    const content = screen.getByTestId("content")

    // Initially closed (default state)
    expect(content).toHaveAttribute("data-state", "closed")

    // Click to open
    fireEvent.click(trigger)
    expect(content).toHaveAttribute("data-state", "open")

    // Click to close
    fireEvent.click(trigger)
    expect(content).toHaveAttribute("data-state", "closed")
  })
})
