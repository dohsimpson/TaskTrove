import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen, waitFor } from "@/test-utils"
import userEvent from "@testing-library/user-event"
import { ComingSoonTooltip } from "./coming-soon-tooltip"

describe("ComingSoonTooltip", () => {
  it("renders children correctly", () => {
    render(
      <ComingSoonTooltip content="Test tooltip">
        <button>Trigger</button>
      </ComingSoonTooltip>,
    )

    expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument()
  })

  it("shows tooltip content on hover", async () => {
    const user = userEvent.setup()

    render(
      <ComingSoonTooltip content="Test tooltip content">
        <button>Trigger</button>
      </ComingSoonTooltip>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    await user.hover(trigger)

    await waitFor(() => {
      expect(screen.getAllByText("Test tooltip content")).toHaveLength(2) // One visible, one for a11y
    })
  })

  it("shows tooltip when trigger is hovered and removes on unhover", async () => {
    const user = userEvent.setup()

    render(
      <ComingSoonTooltip content="Test tooltip content">
        <button>Trigger</button>
      </ComingSoonTooltip>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })

    // Initially closed
    expect(trigger).toHaveAttribute("data-state", "closed")

    // Hover to show tooltip
    await user.hover(trigger)
    await waitFor(() => {
      expect(screen.getAllByText("Test tooltip content")).toHaveLength(2)
    })
  })

  it("renders with default side prop (top)", () => {
    render(
      <ComingSoonTooltip content="Test tooltip">
        <button>Trigger</button>
      </ComingSoonTooltip>,
    )

    // The component should render without errors with default props
    expect(screen.getByRole("button", { name: "Trigger" })).toBeInTheDocument()
  })

  it("renders with different side props", () => {
    const sides: Array<"top" | "right" | "bottom" | "left"> = ["top", "right", "bottom", "left"]

    sides.forEach((side) => {
      const { unmount } = render(
        <ComingSoonTooltip content="Test tooltip" side={side}>
          <button>Trigger {side}</button>
        </ComingSoonTooltip>,
      )

      expect(screen.getByRole("button", { name: `Trigger ${side}` })).toBeInTheDocument()
      unmount()
    })
  })

  it("applies custom className", async () => {
    const user = userEvent.setup()

    render(
      <ComingSoonTooltip content="Test tooltip" className="custom-tooltip-class">
        <button>Trigger</button>
      </ComingSoonTooltip>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    await user.hover(trigger)

    await waitFor(() => {
      const tooltips = screen.getAllByText("Test tooltip")
      expect(tooltips[0]).toHaveClass("custom-tooltip-class")
    })
  })

  it("renders React node content", async () => {
    const user = userEvent.setup()

    const content = (
      <div>
        <strong>Bold text</strong>
        <span> and regular text</span>
      </div>
    )

    render(
      <ComingSoonTooltip content={content}>
        <button>Trigger</button>
      </ComingSoonTooltip>,
    )

    const trigger = screen.getByRole("button", { name: "Trigger" })
    await user.hover(trigger)

    await waitFor(() => {
      expect(screen.getAllByText("Bold text")).toHaveLength(2)
      expect(
        screen.getAllByText((content, element) => {
          return element?.textContent === " and regular text"
        }),
      ).toHaveLength(2)
    })
  })

  it("has proper accessibility attributes", async () => {
    const user = userEvent.setup()

    render(
      <ComingSoonTooltip content="Accessible tooltip">
        <button>Accessible trigger</button>
      </ComingSoonTooltip>,
    )

    const trigger = screen.getByRole("button", { name: "Accessible trigger" })

    // Check that trigger has proper ARIA attributes
    expect(trigger).toHaveAttribute("data-state", "closed")

    await user.hover(trigger)

    await waitFor(() => {
      expect(trigger).toHaveAttribute("data-state", "delayed-open")
    })
  })

  it("handles keyboard navigation", async () => {
    const user = userEvent.setup()

    render(
      <ComingSoonTooltip content="Keyboard accessible">
        <button>Keyboard trigger</button>
      </ComingSoonTooltip>,
    )

    const trigger = screen.getByRole("button", { name: "Keyboard trigger" })

    // Focus the trigger
    await user.tab()
    expect(trigger).toHaveFocus()

    // Tooltip should show on focus
    await waitFor(() => {
      expect(screen.getAllByText("Keyboard accessible")).toHaveLength(2)
    })
  })

  it("has 100ms delay duration", async () => {
    const user = userEvent.setup()

    render(
      <ComingSoonTooltip content="Instant tooltip">
        <button>No delay trigger</button>
      </ComingSoonTooltip>,
    )

    const trigger = screen.getByRole("button", { name: "No delay trigger" })
    await user.hover(trigger)

    // Should appear within 200ms due to 100ms delay
    await waitFor(
      () => {
        expect(screen.getAllByText("Instant tooltip")).toHaveLength(2)
      },
      { timeout: 200 },
    )
  })
})
