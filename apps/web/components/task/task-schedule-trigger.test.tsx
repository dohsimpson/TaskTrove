import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { TaskScheduleTrigger } from "./task-schedule-trigger"

describe("TaskScheduleTrigger", () => {
  it("renders fallback label when no schedule", () => {
    render(<TaskScheduleTrigger fallbackLabel="Add date" />)
    expect(screen.getByText("Add date")).toBeInTheDocument()
  })

  it("renders due date text when provided", () => {
    const dueDate = new Date("2024-11-02T00:00:00")
    render(<TaskScheduleTrigger dueDate={dueDate} />)
    expect(screen.getByText(/11\/2\/2024/)).toBeInTheDocument()
  })

  it("applies overdue styling when due date is past", () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const { container } = render(<TaskScheduleTrigger dueDate={pastDate} />)
    expect(container.firstChild).toHaveClass("bg-rose-100/80")
  })

  it("respects variant class names", () => {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const { container } = render(
      <TaskScheduleTrigger dueDate={futureDate} variant="compact" className="custom-class" />,
    )
    expect(container.firstChild).toHaveClass("custom-class")
    expect(container.firstChild).toHaveClass("text-xs")
  })

  it("renders fallback label using button variant", () => {
    render(<TaskScheduleTrigger variant="button" fallbackLabel="Schedule" />)
    expect(screen.getByText("Schedule")).toBeInTheDocument()
  })
})
