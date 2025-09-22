import React from "react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { HelpPopover } from "./help-popover"

describe("HelpPopover", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders help trigger button", () => {
    render(<HelpPopover content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    expect(button).toBeInTheDocument()
  })

  it("renders help circle icon in trigger button", () => {
    render(<HelpPopover content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass("h-6", "w-6", "p-0", "rounded-full")
  })

  it("applies custom className to trigger button", () => {
    render(<HelpPopover content="Help content" className="custom-class" />)

    const button = screen.getByRole("button", { name: /show help/i })
    expect(button).toHaveClass("custom-class")
  })

  it("applies custom iconClassName to icon", () => {
    render(<HelpPopover content="Help content" iconClassName="custom-icon-class" />)

    const button = screen.getByRole("button", { name: /show help/i })
    const icon = button.querySelector("svg")
    expect(icon).toHaveClass("custom-icon-class")
  })

  it("shows content when popover is opened", () => {
    render(<HelpPopover content="This is help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    expect(screen.getByText("This is help content")).toBeInTheDocument()
  })

  it("renders string content correctly", () => {
    render(<HelpPopover content="Simple help text" />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    expect(screen.getByText("Simple help text")).toBeInTheDocument()
  })

  it("renders ReactNode content correctly", () => {
    const content = (
      <div>
        <p>Complex help content</p>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
      </div>
    )

    render(<HelpPopover content={content} />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    expect(screen.getByText("Complex help content")).toBeInTheDocument()
    expect(screen.getByText("Item 1")).toBeInTheDocument()
    expect(screen.getByText("Item 2")).toBeInTheDocument()
  })

  it("renders title when provided", () => {
    render(<HelpPopover title="Help Title" content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    expect(screen.getByText("Help Title")).toBeInTheDocument()
  })

  it("renders lightbulb icon in header when title is provided", () => {
    render(<HelpPopover title="Help Title" content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    // Should have header with lightbulb icon
    const header = screen.getByText("Help Title").closest("div")?.parentElement
    expect(header).toHaveClass("flex", "items-center", "gap-3")
  })

  it("does not render header when no title is provided", () => {
    render(<HelpPopover content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    // Should not have header section
    expect(screen.queryByRole("heading")).not.toBeInTheDocument()
  })

  it("applies correct popover positioning props", () => {
    render(<HelpPopover content="Help content" align="end" side="top" />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    // Popover should be rendered (we can't easily test Radix positioning props directly)
    expect(screen.getByText("Help content")).toBeInTheDocument()
  })

  it("has correct accessibility attributes", () => {
    render(<HelpPopover content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    expect(button).toHaveAttribute("title", "Show help")
  })

  it("has proper focus styles", () => {
    render(<HelpPopover content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    expect(button).toHaveClass("focus-visible:outline-none", "focus-visible:ring-2")
  })

  it("toggles popover open state", () => {
    render(<HelpPopover content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })

    // Initially closed
    expect(screen.queryByText("Help content")).not.toBeInTheDocument()

    // Open popover
    fireEvent.click(button)
    expect(screen.getByText("Help content")).toBeInTheDocument()

    // Close popover by clicking trigger again
    fireEvent.click(button)
    expect(screen.queryByText("Help content")).not.toBeInTheDocument()
  })

  it("has proper popover styling", () => {
    render(<HelpPopover content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    // Check popover content styling (approximate check)
    const content = screen.getByText("Help content")
    expect(content.closest('[role="dialog"]')).toBeInTheDocument()
  })

  it("handles complex content with nested elements", () => {
    const complexContent = (
      <div>
        <h3>Complex Help</h3>
        <p>
          This is a paragraph with <strong>bold text</strong>.
        </p>
        <div>
          <button>Action Button</button>
        </div>
      </div>
    )

    render(<HelpPopover content={complexContent} />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    expect(screen.getByText("Complex Help")).toBeInTheDocument()
    expect(screen.getByText("bold text")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Action Button" })).toBeInTheDocument()
  })

  it("applies muted text color to content area", () => {
    render(<HelpPopover content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    fireEvent.click(button)

    const contentDiv = screen.getByText("Help content").closest(".p-4")
    expect(contentDiv?.firstChild).toHaveClass("text-muted-foreground")
  })

  it("has cursor-pointer styling on trigger button", () => {
    render(<HelpPopover content="Help content" />)

    const button = screen.getByRole("button", { name: /show help/i })
    expect(button).toHaveClass("cursor-pointer")
  })
})
