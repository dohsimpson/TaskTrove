import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MaterialCard } from "./material-card"

describe("MaterialCard", () => {
  it("renders children correctly", () => {
    render(<MaterialCard>Test Content</MaterialCard>)
    expect(screen.getByText("Test Content")).toBeInTheDocument()
  })

  it("applies default variant styles", () => {
    const { container } = render(<MaterialCard>Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("p-3", "sm:p-4", "md:p-5", "rounded-xl")
  })

  it("applies compact variant styles", () => {
    const { container } = render(<MaterialCard variant="compact">Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("p-2", "rounded", "border-l-3")
  })

  it("applies kanban variant styles", () => {
    const { container } = render(<MaterialCard variant="kanban">Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("p-3", "rounded-lg", "border-l-3")
  })

  it("applies calendar variant styles", () => {
    const { container } = render(<MaterialCard variant="calendar">Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("p-0.5", "lg:p-1", "rounded", "border-l-3")
  })

  it("applies subtask variant styles", () => {
    const { container } = render(<MaterialCard variant="subtask">Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("rounded-md", "p-2", "bg-muted/50")
  })

  it("applies selected state styles", () => {
    const { container } = render(<MaterialCard selected>Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("bg-accent", "text-accent-foreground")
  })

  it("applies completed state styles", () => {
    const { container } = render(<MaterialCard completed>Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("opacity-60")
  })

  it("applies completed state styles for calendar variant", () => {
    const { container } = render(
      <MaterialCard variant="calendar" completed>
        Content
      </MaterialCard>,
    )
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("bg-muted", "text-muted-foreground", "line-through")
  })

  it("applies custom className", () => {
    const { container } = render(<MaterialCard className="custom-class">Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("custom-class")
  })

  it("applies left border color", () => {
    const { container } = render(
      <MaterialCard leftBorderColor="border-l-red-500">Content</MaterialCard>,
    )
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("border-l-red-500")
  })

  it("handles click events", async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<MaterialCard onClick={handleClick}>Content</MaterialCard>)

    await user.click(screen.getByText("Content"))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("handles mouse enter events", async () => {
    const user = userEvent.setup()
    const handleMouseEnter = vi.fn()
    render(<MaterialCard onMouseEnter={handleMouseEnter}>Content</MaterialCard>)

    await user.hover(screen.getByText("Content"))
    expect(handleMouseEnter).toHaveBeenCalled()
  })

  it("handles mouse leave events", async () => {
    const user = userEvent.setup()
    const handleMouseLeave = vi.fn()
    render(<MaterialCard onMouseLeave={handleMouseLeave}>Content</MaterialCard>)

    const element = screen.getByText("Content")
    await user.hover(element)
    await user.unhover(element)
    expect(handleMouseLeave).toHaveBeenCalled()
  })

  it("passes through data attributes", () => {
    const { container } = render(<MaterialCard data-task-focused={true}>Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveAttribute("data-task-focused", "true")
  })

  it("combines selected and completed states", () => {
    const { container } = render(
      <MaterialCard selected completed>
        Content
      </MaterialCard>,
    )
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("bg-accent", "opacity-60")
  })

  it("applies cursor-pointer class", () => {
    const { container } = render(<MaterialCard>Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("cursor-pointer")
  })

  it("applies group and relative classes", () => {
    const { container } = render(<MaterialCard>Content</MaterialCard>)
    const card = container.firstChild
    if (!(card instanceof HTMLElement)) throw new Error("Expected HTMLElement")
    expect(card).toHaveClass("group", "relative")
  })

  it("renders complex children structure", () => {
    render(
      <MaterialCard>
        <div>
          <h1>Title</h1>
          <p>Description</p>
        </div>
      </MaterialCard>,
    )
    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Description")).toBeInTheDocument()
  })
})
