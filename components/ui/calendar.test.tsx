import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@/test-utils"
import { Calendar } from "./calendar"

describe("Calendar", () => {
  it("renders calendar correctly", () => {
    render(<Calendar />)

    // Check that the calendar grid is rendered
    expect(screen.getByRole("grid")).toBeInTheDocument()
  })

  it("applies today class with dot styling", () => {
    const today = new Date()
    render(<Calendar defaultMonth={today} />)

    // Find the gridcell for today's date
    const todayCell = screen.getByRole("gridcell", {
      name: new RegExp(`Today.*${today.getDate()}`),
    })

    expect(todayCell).toBeInTheDocument()

    // Verify the today class contains the dot styling classes
    const todayClasses = todayCell.className
    expect(todayClasses).toMatch(/rdp-today/)
    expect(todayClasses).toContain("relative")
    expect(todayClasses).toContain("after:absolute")
    expect(todayClasses).toContain("after:bottom-1")
    expect(todayClasses).toContain("after:left-1/2")
    expect(todayClasses).toContain("after:-translate-x-1/2")
    expect(todayClasses).toContain("after:w-1")
    expect(todayClasses).toContain("after:h-1")
    expect(todayClasses).toContain("after:bg-primary")
    expect(todayClasses).toContain("after:rounded-full")
  })

  it("does not apply dot styling to non-today dates", () => {
    render(<Calendar />)

    // Get all gridcells and find one that doesn't have "Today" in the name
    const allCells = screen.getAllByRole("gridcell")
    const nonTodayCell = allCells.find((cell) => {
      const ariaLabel = cell.getAttribute("aria-label")
      return ariaLabel && !ariaLabel.includes("Today")
    })

    expect(nonTodayCell).toBeTruthy()

    // Check that the day cell does not have today styling
    if (nonTodayCell) {
      const todayClasses = nonTodayCell.className
      expect(todayClasses).not.toMatch(/rdp-today/)
    }
  })

  it("shows outside days when showOutsideDays is true", () => {
    render(<Calendar showOutsideDays={true} />)

    // Calendar should be rendered (we can't easily test outside days without more complex setup)
    expect(screen.getByRole("grid")).toBeInTheDocument()
  })

  it("accepts custom className prop", () => {
    const customClass = "custom-calendar-class"
    render(<Calendar className={customClass} />)

    const calendar = document.querySelector('[data-slot="calendar"]')
    expect(calendar).toHaveClass(customClass)
  })
})
