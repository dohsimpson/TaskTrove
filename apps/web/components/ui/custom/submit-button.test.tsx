import { render, screen, fireEvent, waitFor, act } from "@testing-library/react"
import { describe, it, expect, vi, afterEach } from "vitest"
import { SubmitButton } from "./submit-button"

// Mock the Button component
vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button disabled={disabled} className={className} {...props}>
      {children}
    </button>
  ),
}))

describe("SubmitButton", () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  it("renders children when not submitting", () => {
    render(<SubmitButton>Submit</SubmitButton>)

    const button = screen.getByRole("button", { name: "Submit" })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
    expect(button.querySelector("svg.animate-spin")).not.toBeInTheDocument()
  })

  it("calls onSubmit when clicked", async () => {
    const mockOnSubmit = vi.fn()
    render(<SubmitButton onSubmit={mockOnSubmit}>Submit</SubmitButton>)

    const button = screen.getByRole("button", { name: "Submit" })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    })
  })

  it("shows loading state while submitting", async () => {
    vi.useFakeTimers()

    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 100)),
    )
    render(<SubmitButton onSubmit={mockOnSubmit}>Submit</SubmitButton>)

    const button = screen.getByRole("button", { name: "Submit" })

    await act(async () => {
      fireEvent.click(button)
    })

    // Should show loading state immediately
    expect(button).toBeDisabled()
    expect(button.querySelector("svg.animate-spin")).toBeInTheDocument()
    expect(screen.getByText("Submit...")).toBeInTheDocument()

    // Advance timers to complete the async operation
    await act(async () => {
      await vi.runAllTimersAsync()
    })

    // Should return to normal state after completion
    expect(mockOnSubmit).toHaveBeenCalledTimes(1)
    expect(button).not.toBeDisabled()
    expect(button.querySelector("svg.animate-spin")).not.toBeInTheDocument()
    expect(screen.getByText("Submit")).toBeInTheDocument()
  })

  it("uses custom submitting text", async () => {
    vi.useFakeTimers()

    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)),
    )
    render(
      <SubmitButton onSubmit={mockOnSubmit} submittingText="Adding task...">
        Submit
      </SubmitButton>,
    )

    const button = screen.getByRole("button")

    await act(async () => {
      fireEvent.click(button)
    })

    expect(screen.getByText("Adding task...")).toBeInTheDocument()

    // Complete the async operation
    await act(async () => {
      await vi.runAllTimersAsync()
    })
  })

  it("is disabled when disabled prop is true", () => {
    render(<SubmitButton disabled>Submit</SubmitButton>)

    const button = screen.getByRole("button", { name: "Submit" })
    expect(button).toBeDisabled()
  })

  it("does not call onSubmit when disabled", () => {
    const mockOnSubmit = vi.fn()
    render(
      <SubmitButton disabled onSubmit={mockOnSubmit}>
        Submit
      </SubmitButton>,
    )

    const button = screen.getByRole("button")
    fireEvent.click(button)

    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it("handles disabled state correctly", async () => {
    const mockOnSubmit = vi.fn()
    render(
      <SubmitButton disabled onSubmit={mockOnSubmit}>
        Submit
      </SubmitButton>,
    )

    const button = screen.getByRole("button")
    expect(button).toBeDisabled()

    fireEvent.click(button)

    // onSubmit should not be called when disabled
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it("hides loading icon when hideLoadingIcon is true", async () => {
    vi.useFakeTimers()

    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)),
    )
    render(
      <SubmitButton onSubmit={mockOnSubmit} hideLoadingIcon>
        Submit
      </SubmitButton>,
    )

    const button = screen.getByRole("button")

    await act(async () => {
      fireEvent.click(button)
    })

    expect(button.querySelector("svg.animate-spin")).not.toBeInTheDocument()
    expect(screen.getByText("Submit...")).toBeInTheDocument()

    // Complete the async operation
    await act(async () => {
      await vi.runAllTimersAsync()
    })
  })

  it("uses custom loading icon", async () => {
    vi.useFakeTimers()

    const CustomIcon = () => <div data-testid="custom-icon">Custom</div>
    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)),
    )

    render(
      <SubmitButton onSubmit={mockOnSubmit} loadingIcon={<CustomIcon />}>
        Submit
      </SubmitButton>,
    )

    const button = screen.getByRole("button")

    await act(async () => {
      fireEvent.click(button)
    })

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument()
    expect(button.querySelector("svg.animate-spin")).not.toBeInTheDocument()

    // Complete the async operation
    await act(async () => {
      await vi.runAllTimersAsync()
    })
  })

  it("applies custom icon sizes", async () => {
    vi.useFakeTimers()

    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)),
    )
    render(
      <SubmitButton onSubmit={mockOnSubmit} loadingIconSize="lg">
        Submit
      </SubmitButton>,
    )

    const button = screen.getByRole("button")

    await act(async () => {
      fireEvent.click(button)
    })

    const loader = button.querySelector("svg.animate-spin")
    expect(loader).toBeInTheDocument()
    expect(loader).toHaveClass("h-5", "w-5")

    // Complete the async operation
    await act(async () => {
      await vi.runAllTimersAsync()
    })
  })

  it("passes through other props", () => {
    render(
      <SubmitButton data-testid="custom-submit" variant="outline" size="lg">
        Submit
      </SubmitButton>,
    )

    const button = screen.getByTestId("custom-submit")
    expect(button).toBeInTheDocument()
  })

  it("handles non-string children", async () => {
    vi.useFakeTimers()

    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)),
    )
    render(
      <SubmitButton onSubmit={mockOnSubmit}>
        <span>Submit Content</span>
      </SubmitButton>,
    )

    const button = screen.getByRole("button")

    await act(async () => {
      fireEvent.click(button)
    })

    // Should show the original content when children is not a string
    expect(screen.getByText("Submit Content")).toBeInTheDocument()

    // Complete the async operation
    await act(async () => {
      await vi.runAllTimersAsync()
    })
  })

  it("works without onSubmit prop", () => {
    render(<SubmitButton>Submit</SubmitButton>)

    const button = screen.getByRole("button", { name: "Submit" })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()

    // Should not crash when clicked without onSubmit
    fireEvent.click(button)
    expect(button.querySelector("svg.animate-spin")).not.toBeInTheDocument()
  })

  it("supports ref forwarding", () => {
    const ref = { current: null }
    render(<SubmitButton ref={ref}>Submit</SubmitButton>)

    const button = screen.getByRole("button")
    expect(ref.current).toBe(button)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
  })
})
