import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
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
    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 100)),
    )
    render(<SubmitButton onSubmit={mockOnSubmit}>Submit</SubmitButton>)

    const button = screen.getByRole("button", { name: "Submit" })
    fireEvent.click(button)

    // Should show loading state immediately
    expect(button).toBeDisabled()
    expect(button.querySelector("svg.animate-spin")).toBeInTheDocument()
    expect(screen.getByText("Submit...")).toBeInTheDocument()

    // Wait for submission to complete
    await waitFor(
      () => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1)
      },
      { timeout: 200 },
    )

    // Should return to normal state after completion
    await waitFor(() => {
      expect(button).not.toBeDisabled()
      expect(button.querySelector("svg.animate-spin")).not.toBeInTheDocument()
      expect(screen.getByText("Submit")).toBeInTheDocument()
    })
  })

  it("uses custom submitting text", async () => {
    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)),
    )
    render(
      <SubmitButton onSubmit={mockOnSubmit} submittingText="Adding task...">
        Submit
      </SubmitButton>,
    )

    const button = screen.getByRole("button")
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText("Adding task...")).toBeInTheDocument()
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
    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)),
    )
    render(
      <SubmitButton onSubmit={mockOnSubmit} hideLoadingIcon>
        Submit
      </SubmitButton>,
    )

    const button = screen.getByRole("button")
    fireEvent.click(button)

    await waitFor(() => {
      expect(button.querySelector("svg.animate-spin")).not.toBeInTheDocument()
      expect(screen.getByText("Submit...")).toBeInTheDocument()
    })
  })

  it("uses custom loading icon", async () => {
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
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByTestId("custom-icon")).toBeInTheDocument()
      expect(button.querySelector("svg.animate-spin")).not.toBeInTheDocument()
    })
  })

  it("applies custom icon sizes", async () => {
    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)),
    )
    render(
      <SubmitButton onSubmit={mockOnSubmit} loadingIconSize="lg">
        Submit
      </SubmitButton>,
    )

    const button = screen.getByRole("button")
    fireEvent.click(button)

    await waitFor(() => {
      const loader = button.querySelector("svg.animate-spin")
      expect(loader).toBeInTheDocument()
      expect(loader).toHaveClass("h-5", "w-5")
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
    const mockOnSubmit = vi.fn(
      () => new Promise<void>((resolve) => setTimeout(() => resolve(), 50)),
    )
    render(
      <SubmitButton onSubmit={mockOnSubmit}>
        <span>Submit Content</span>
      </SubmitButton>,
    )

    const button = screen.getByRole("button")
    fireEvent.click(button)

    await waitFor(() => {
      // Should show the original content when children is not a string
      expect(screen.getByText("Submit Content")).toBeInTheDocument()
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
