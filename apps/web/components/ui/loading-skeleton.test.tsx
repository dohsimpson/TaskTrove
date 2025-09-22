import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@/test-utils"
import { Skeleton, TaskItemSkeleton, MetricCardSkeleton } from "./loading-skeleton"

describe("Skeleton", () => {
  it("renders with default classes", () => {
    const { container } = render(<Skeleton />)

    const skeleton = container.querySelector("div")
    expect(skeleton).toHaveClass("animate-pulse", "rounded-md", "bg-muted")
  })

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="custom-class" />)

    const skeleton = container.querySelector("div")
    expect(skeleton).toHaveClass("custom-class")
  })

  it("passes through other props", () => {
    const { container } = render(<Skeleton data-testid="test-skeleton" />)

    const skeleton = container.querySelector("div")
    expect(skeleton).toHaveAttribute("data-testid", "test-skeleton")
  })

  it("renders as a div element", () => {
    const { container } = render(<Skeleton />)

    const skeleton = container.querySelector("div")
    expect(skeleton?.nodeName).toBe("DIV")
  })

  it("combines custom classes with default classes", () => {
    const { container } = render(<Skeleton className="h-4 w-full" />)

    const skeleton = container.querySelector("div")
    expect(skeleton).toHaveClass("animate-pulse", "rounded-md", "bg-muted", "h-4", "w-full")
  })
})

describe("TaskItemSkeleton", () => {
  it("renders task item skeleton structure", () => {
    const { container } = render(<TaskItemSkeleton />)

    // Check for main container
    const mainContainer = container.querySelector(".p-4.bg-card.rounded-lg.border")
    expect(mainContainer).toBeInTheDocument()

    // Check for flex container
    const flexContainer = container.querySelector(".flex.items-start.gap-3")
    expect(flexContainer).toBeInTheDocument()
  })

  it("renders checkbox skeleton", () => {
    const { container } = render(<TaskItemSkeleton />)

    const checkboxSkeleton = container.querySelector(".h-4.w-4.rounded.mt-1")
    expect(checkboxSkeleton).toBeInTheDocument()
  })

  it("renders title and subtitle skeletons", () => {
    const { container } = render(<TaskItemSkeleton />)

    const titleSkeleton = container.querySelector(".h-4.w-3\\/4")
    const subtitleSkeleton = container.querySelector(".h-3.w-1\\/2")

    expect(titleSkeleton).toBeInTheDocument()
    expect(subtitleSkeleton).toBeInTheDocument()
  })

  it("renders tag skeletons", () => {
    const { container } = render(<TaskItemSkeleton />)

    const tagSkeletons = container.querySelectorAll(".h-5.rounded-full")
    expect(tagSkeletons).toHaveLength(2)
  })

  it("renders action button skeleton", () => {
    const { container } = render(<TaskItemSkeleton />)

    const actionSkeleton = container.querySelector(".h-8.w-8.rounded")
    expect(actionSkeleton).toBeInTheDocument()
  })

  it("has proper dark mode classes", () => {
    const { container } = render(<TaskItemSkeleton />)

    const mainContainer = container.querySelector(".p-4")
    expect(mainContainer).toHaveClass("bg-card", "border-border")
  })
})

describe("MetricCardSkeleton", () => {
  it("renders metric card skeleton structure", () => {
    const { container } = render(<MetricCardSkeleton />)

    // Check for main container
    const mainContainer = container.querySelector(".p-6.bg-card.rounded-lg.border")
    expect(mainContainer).toBeInTheDocument()
  })

  it("renders header skeletons", () => {
    const { container } = render(<MetricCardSkeleton />)

    const headerContainer = container.querySelector(".flex.items-center.justify-between.mb-4")
    expect(headerContainer).toBeInTheDocument()

    const titleSkeleton = headerContainer?.querySelector(".h-4.w-20")
    const iconSkeleton = headerContainer?.querySelector(".h-5.w-5.rounded")

    expect(titleSkeleton).toBeInTheDocument()
    expect(iconSkeleton).toBeInTheDocument()
  })

  it("renders metric value skeletons", () => {
    const { container } = render(<MetricCardSkeleton />)

    const valueContainer = container.querySelector(".flex.items-baseline.justify-between")
    expect(valueContainer).toBeInTheDocument()

    const valueSkeleton = valueContainer?.querySelector(".h-8.w-16")
    const badgeSkeleton = valueContainer?.querySelector(".h-6.w-12.rounded-full")

    expect(valueSkeleton).toBeInTheDocument()
    expect(badgeSkeleton).toBeInTheDocument()
  })

  it("renders description skeleton", () => {
    const { container } = render(<MetricCardSkeleton />)

    const descriptionSkeleton = container.querySelector(".h-3.w-24.mt-2")
    expect(descriptionSkeleton).toBeInTheDocument()
  })

  it("has proper dark mode classes", () => {
    const { container } = render(<MetricCardSkeleton />)

    const mainContainer = container.querySelector(".p-6")
    expect(mainContainer).toHaveClass("bg-card", "border-border")
  })
})
