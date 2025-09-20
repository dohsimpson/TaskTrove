import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@/test-utils"
import { TaskEmptyState } from "./task-empty-state"

describe("TaskEmptyState", () => {
  it("renders with default props", () => {
    render(<TaskEmptyState />)

    expect(screen.getByText("No tasks found")).toBeInTheDocument()
    // Description should not be rendered when undefined
    expect(screen.queryByText("Create your first task to get started")).not.toBeInTheDocument()
  })

  it("renders with custom title and description", () => {
    render(<TaskEmptyState title="Custom title" description="Custom description" />)

    expect(screen.getByText("Custom title")).toBeInTheDocument()
    expect(screen.getByText("Custom description")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(<TaskEmptyState className="custom-class" />)

    expect(container.firstChild).toHaveClass("custom-class")
  })

  it("renders without description when description is undefined", () => {
    render(<TaskEmptyState title="No items" description={undefined} />)

    expect(screen.getByText("No items")).toBeInTheDocument()
    expect(screen.queryByText("Create your first task to get started")).not.toBeInTheDocument()
  })
})
