import { render } from "@/test-utils"
import { describe, it, expect } from "vitest"
import { TaskDueDate } from "./task-due-date"

describe("TaskDueDate", () => {
  const pastDate = new Date("2023-01-01")
  const futureDate = new Date("2025-12-31")

  it("should render without data-action attribute", () => {
    const { container } = render(<TaskDueDate dueDate={futureDate} completed={false} />)

    const span = container.querySelector("span")
    expect(span).not.toHaveAttribute("data-action")
  })

  it("should render nothing when no dueDate or recurring", () => {
    const { container } = render(<TaskDueDate />)
    expect(container.firstChild).toBeNull()
  })

  it("should render overdue styling for past dates", () => {
    const { container } = render(<TaskDueDate dueDate={pastDate} completed={false} />)

    const span = container.querySelector("span")
    expect(span).toHaveClass("text-red-600")

    const calendarIcon = container.querySelector('[data-testid="calendar-icon"]')
    expect(calendarIcon).toBeInTheDocument()
  })

  it("should not render overdue styling for completed tasks", () => {
    const { container } = render(<TaskDueDate dueDate={pastDate} completed={true} />)

    const alertTriangleIcon = container.querySelector('[data-testid="alert-triangle-icon"]')
    expect(alertTriangleIcon).not.toBeInTheDocument()
  })

  it("should render time when only dueTime and recurring are set (daily with time)", () => {
    const dueTime = new Date("2024-01-01T09:00:00") // 9:00 AM
    const { container } = render(
      <TaskDueDate dueTime={dueTime} recurring="daily" completed={false} />,
    )

    // Should render the component (not null)
    const span = container.querySelector("span")
    expect(span).toBeInTheDocument()

    // Should display the time - "9AM" in the badge format
    expect(container.textContent).toContain("9AM")

    // Should show repeat icon for recurring
    const repeatIcon = container.querySelector('[data-testid="repeat-icon"]')
    expect(repeatIcon).toBeInTheDocument()
  })
})
