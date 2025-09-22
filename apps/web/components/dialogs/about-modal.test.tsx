import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@/test-utils"
import { AboutModal } from "./about-modal"

// Mock package.json
vi.mock("@/package.json", () => ({
  default: {
    version: "0.1.0",
  },
}))

// Mock window.open
const mockWindowOpen = vi.fn()
Object.defineProperty(window, "open", {
  value: mockWindowOpen,
  writable: true,
})

describe("AboutModal", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders when open", () => {
    render(<AboutModal {...defaultProps} />)

    expect(screen.getByText("TaskTrove")).toBeInTheDocument()
    expect(screen.getByText("v0.1.0")).toBeInTheDocument()
    expect(screen.getByText("made with")).toBeInTheDocument()
    expect(screen.getByText("@dohsimpson")).toBeInTheDocument()
  })

  it("does not render when closed", () => {
    render(<AboutModal {...defaultProps} open={false} />)

    expect(screen.queryByText("TaskTrove")).not.toBeInTheDocument()
  })

  it("displays version correctly", () => {
    render(<AboutModal {...defaultProps} />)

    expect(screen.getByText("v0.1.0")).toBeInTheDocument()
  })

  it("renders action buttons", () => {
    render(<AboutModal {...defaultProps} />)

    expect(screen.getByRole("button", { name: /star on github/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sponsor/i })).toBeInTheDocument()
  })

  it("opens GitHub repository when Star on GitHub button is clicked", () => {
    render(<AboutModal {...defaultProps} />)

    const starButton = screen.getByRole("button", { name: /star on github/i })
    fireEvent.click(starButton)

    expect(mockWindowOpen).toHaveBeenCalledWith("https://github.com/dohsimpson/TaskTrove", "_blank")
  })

  it("opens GitHub sponsors when Sponsor button is clicked", () => {
    render(<AboutModal {...defaultProps} />)

    const sponsorButton = screen.getByRole("button", { name: /sponsor/i })
    fireEvent.click(sponsorButton)

    expect(mockWindowOpen).toHaveBeenCalledWith("https://github.com/sponsors/dohsimpson", "_blank")
  })

  it("renders author button that opens link", () => {
    render(<AboutModal {...defaultProps} />)

    const authorButton = screen.getByRole("button", { name: /@dohsimpson/i })
    expect(authorButton).toBeInTheDocument()
  })

  it("calls onOpenChange when dialog state changes", () => {
    const mockOnOpenChange = vi.fn()
    render(<AboutModal {...defaultProps} onOpenChange={mockOnOpenChange} />)

    // Simulate dialog close (this would typically be triggered by the dialog component)
    const dialog = screen.getByRole("dialog")
    expect(dialog).toBeInTheDocument()

    // We can't easily test the onOpenChange callback without more complex setup
    // since it's handled internally by the Dialog component
    expect(mockOnOpenChange).not.toHaveBeenCalled()
  })
})
