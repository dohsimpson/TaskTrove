import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { TimeEstimationButton } from "./time-estimation-button"

describe("TimeEstimationButton", () => {
  it("should render with no time set", () => {
    const onChange = vi.fn()
    render(<TimeEstimationButton value={0} onChange={onChange} />)

    const button = screen.getByRole("button")
    expect(button).toBeInTheDocument()
  })

  it("should display formatted time when value is set", () => {
    const onChange = vi.fn()
    // 1 hour 30 minutes = 5400 seconds
    render(<TimeEstimationButton value={5400} onChange={onChange} />)

    const button = screen.getByRole("button")
    expect(button).toHaveTextContent("1h 30m")
  })

  it("should display minutes only when under an hour", () => {
    const onChange = vi.fn()
    // 30 minutes = 1800 seconds
    render(<TimeEstimationButton value={1800} onChange={onChange} />)

    const button = screen.getByRole("button")
    expect(button).toHaveTextContent("30m")
  })

  it("should display hours only when no minutes", () => {
    const onChange = vi.fn()
    // 2 hours = 7200 seconds
    render(<TimeEstimationButton value={7200} onChange={onChange} />)

    const button = screen.getByRole("button")
    expect(button).toHaveTextContent("2h")
  })

  it("should open popover when clicked", async () => {
    const onChange = vi.fn()
    render(<TimeEstimationButton value={0} onChange={onChange} />)

    const button = screen.getByRole("button")
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText("Time Estimation")).toBeInTheDocument()
    })
  })

  it("should call onChange when preset is clicked and Done is pressed", async () => {
    const onChange = vi.fn()
    render(<TimeEstimationButton value={0} onChange={onChange} />)

    const button = screen.getByRole("button")
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText("Time Estimation")).toBeInTheDocument()
    })

    // Click 30min preset
    const presetButton = screen.getByText("30min")
    fireEvent.click(presetButton)

    // Click Done to confirm
    const doneButton = screen.getByText("Done")
    fireEvent.click(doneButton)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(1800) // 30 minutes = 1800 seconds
    })
  })

  it("should call onChange when custom time is entered and Done is pressed", async () => {
    const onChange = vi.fn()
    render(<TimeEstimationButton value={0} onChange={onChange} />)

    const button = screen.getByRole("button")
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText("Time Estimation")).toBeInTheDocument()
    })

    // Find inputs by their associated labels
    const hourLabel = screen.getByText("Hour")
    const minuteLabel = screen.getByText("Minute")

    const hourInput = hourLabel.parentElement?.querySelector("input")
    const minuteInput = minuteLabel.parentElement?.querySelector("input")

    expect(hourInput).toBeTruthy()
    expect(minuteInput).toBeTruthy()

    if (hourInput && minuteInput) {
      fireEvent.change(hourInput, { target: { value: "2" } })
      fireEvent.change(minuteInput, { target: { value: "15" } })
    }

    // Click Done to confirm
    const doneButton = screen.getByText("Done")
    fireEvent.click(doneButton)

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(8100) // 2 hours 15 minutes = 8100 seconds
    })
  })

  it("should validate input and show error messages", async () => {
    const onChange = vi.fn()
    render(<TimeEstimationButton value={0} onChange={onChange} />)

    const button = screen.getByRole("button")
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText("Time Estimation")).toBeInTheDocument()
    })

    // Find inputs by their associated labels
    const hourLabel = screen.getByText("Hour")
    const minuteLabel = screen.getByText("Minute")

    const hourInput = hourLabel.parentElement?.querySelector("input")
    const minuteInput = minuteLabel.parentElement?.querySelector("input")

    expect(hourInput).toBeTruthy()
    expect(minuteInput).toBeTruthy()

    if (hourInput && minuteInput) {
      // Test invalid input shows error
      fireEvent.change(hourInput, { target: { value: "abc" } })
      await waitFor(() => {
        expect(screen.getByText("Must be a number (0-99)")).toBeInTheDocument()
      })
    }

    // Close and reopen popover for clean state to test 90 minutes functionality
    const cancelButton = screen.getByText("Done")
    fireEvent.click(cancelButton)

    await waitFor(() => {
      expect(screen.queryByText("Time Estimation")).not.toBeInTheDocument()
    })

    // Reopen popover
    const button2 = screen.getByRole("button")
    fireEvent.click(button2)

    await waitFor(() => {
      expect(screen.getByText("Time Estimation")).toBeInTheDocument()
    })

    // Find inputs again
    const hourLabel2 = screen.getByText("Hour")
    const minuteLabel2 = screen.getByText("Minute")

    const hourInput2 = hourLabel2.parentElement?.querySelector("input")
    const minuteInput2 = minuteLabel2.parentElement?.querySelector("input")

    expect(hourInput2).toBeTruthy()
    expect(minuteInput2).toBeTruthy()

    if (hourInput2 && minuteInput2) {
      // Test minutes > 59 shows error
      fireEvent.change(hourInput2, { target: { value: "1" } })
      fireEvent.change(minuteInput2, { target: { value: "90" } })
      await waitFor(() => {
        expect(screen.getByText("Minutes must be between 0-59")).toBeInTheDocument()
      })

      // Test valid input works and formats on blur
      fireEvent.change(hourInput2, { target: { value: "1" } })
      fireEvent.change(minuteInput2, { target: { value: "30" } })
      fireEvent.blur(minuteInput2)
      await waitFor(() => {
        expect(minuteInput2).toHaveValue("30")
      })
    }
  })

  it("should highlight selected preset and clear when custom input changes", async () => {
    const onChange = vi.fn()
    render(<TimeEstimationButton value={0} onChange={onChange} />)

    const button = screen.getByRole("button")
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText("Time Estimation")).toBeInTheDocument()
    })

    // Click 30min preset and verify it's highlighted
    const presetButton = screen.getByText("30min")
    fireEvent.click(presetButton)

    // The button should have default variant styling (highlighted) after selection - it should not have the outline border anymore
    expect(presetButton).not.toHaveClass("border")
    expect(presetButton).not.toHaveClass("bg-background")

    // Find custom inputs
    const hourLabel = screen.getByText("Hour")
    const hourInput = hourLabel.parentElement?.querySelector("input")

    expect(hourInput).toBeTruthy()

    if (hourInput) {
      // Type in custom input should clear preset selection
      fireEvent.change(hourInput, { target: { value: "1" } })

      // The preset button should now have outline variant styling again (border + bg-background)
      expect(presetButton).toHaveClass("border")
      expect(presetButton).toHaveClass("bg-background")
    }
  })
})
