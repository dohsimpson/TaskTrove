import React from "react"
import { describe, it, expect } from "vitest"
import { render, screen } from "@/test-utils"
import { Calendar } from "./calendar"

describe("Custom Calendar wrapper", () => {
  it("centers the view on the selected date's month by default", () => {
    const selectedDate = new Date("2025-01-07T12:00:00Z")

    render(<Calendar mode="single" selected={selectedDate} />)

    expect(screen.getByText(/January 2025/i)).toBeInTheDocument()
  })
})
