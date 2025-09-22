import React from "react"
import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { ComingSoonWrapper } from "./coming-soon-wrapper"

describe("ComingSoonWrapper", () => {
  it("renders children when not disabled", () => {
    render(
      <ComingSoonWrapper disabled={false}>
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    expect(screen.getByRole("button", { name: "Test Button" })).toBeInTheDocument()
    expect(screen.queryByTestId("lightning-icon")).not.toBeInTheDocument()
  })

  it("wraps children with tooltip and lightning icon when disabled", () => {
    render(
      <ComingSoonWrapper disabled={true}>
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    expect(screen.getByRole("button", { name: "Test Button" })).toBeInTheDocument()
    expect(screen.getByTestId("lightning-icon")).toBeInTheDocument()
    expect(screen.getByTestId("tooltip-wrapper")).toBeInTheDocument()
  })

  it("applies custom className when disabled", () => {
    render(
      <ComingSoonWrapper disabled={true} className="custom-class">
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    const wrapper = screen.getByTestId("tooltip-wrapper")
    expect(wrapper).toHaveClass("custom-class")
  })

  it("has correct lightning icon styling", () => {
    render(
      <ComingSoonWrapper disabled={true}>
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    const lightningIcon = screen.getByTestId("lightning-icon")
    expect(lightningIcon).toHaveClass("text-yellow-500", "animate-pulse")
    expect(lightningIcon).toHaveClass("absolute", "-top-1", "-right-1", "h-3", "w-3")
  })

  it("renders with default tooltipContent prop", () => {
    const { rerender } = render(
      <ComingSoonWrapper disabled={true}>
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    // Component should render without error with default tooltipContent
    expect(screen.getByTestId("lightning-icon")).toBeInTheDocument()

    // Test with custom tooltipContent string
    rerender(
      <ComingSoonWrapper disabled={true} tooltipContent="Custom Coming Soon">
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    expect(screen.getByTestId("lightning-icon")).toBeInTheDocument()
  })

  it("renders with React component as tooltipContent", () => {
    const customTooltip = (
      <div>
        <strong>Feature Coming Soon!</strong>
        <p>This will be amazing</p>
      </div>
    )

    render(
      <ComingSoonWrapper disabled={true} tooltipContent={customTooltip}>
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    // Component should render without error with React component tooltipContent
    expect(screen.getByTestId("lightning-icon")).toBeInTheDocument()
    expect(screen.getByTestId("tooltip-wrapper")).toBeInTheDocument()
  })

  it("opens modal when clicked", () => {
    render(
      <ComingSoonWrapper disabled={true} featureName="Test Feature">
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    const wrapper = screen.getByTestId("tooltip-wrapper")
    fireEvent.click(wrapper)

    expect(screen.getByText("Test Feature")).toBeInTheDocument()
    expect(screen.getByText("is cooking!")).toBeInTheDocument()
  })

  it("uses default feature name when not provided", () => {
    render(
      <ComingSoonWrapper disabled={true}>
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    const wrapper = screen.getByTestId("tooltip-wrapper")
    fireEvent.click(wrapper)

    expect(screen.getByText("this feature")).toBeInTheDocument()
    expect(screen.getByText("is cooking!")).toBeInTheDocument()
  })

  it("prevents event propagation when clicked", () => {
    const parentClickHandler = vi.fn()

    render(
      <div onClick={parentClickHandler}>
        <ComingSoonWrapper disabled={true}>
          <button>Test Button</button>
        </ComingSoonWrapper>
      </div>,
    )

    const wrapper = screen.getByTestId("tooltip-wrapper")
    fireEvent.click(wrapper)

    expect(parentClickHandler).not.toHaveBeenCalled()
  })

  it("has cursor-pointer class when disabled", () => {
    render(
      <ComingSoonWrapper disabled={true}>
        <button>Test Button</button>
      </ComingSoonWrapper>,
    )

    const wrapper = screen.getByTestId("tooltip-wrapper")
    expect(wrapper).toHaveClass("cursor-pointer")
  })
})
